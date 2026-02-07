// src/modules/route/services/bidirectional-route.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from '../entities/route.entity';
import { RouteSegment } from '../entities/route-segment.entity';
import { logger } from '@/utils/logger.util';
import { floorToNearest50, ceilToNearest50, roundToNearest50 } from '@/utils/fare.util';

/**
 * Helper to extract clean transport mode from potentially malformed data
 */
function cleanTransportMode(mode: any): 'bus' | 'taxi' | 'keke' | 'okada' | 'walk' {
  if (!mode) return 'bus';

  let cleanMode = mode;

  if (typeof mode === 'object' && mode !== null) {
    cleanMode = mode.type || mode.mode || Object.values(mode)[0] || 'bus';
  }

  if (typeof cleanMode === 'string') {
    cleanMode = cleanMode
      .replace(/^\{?"?/g, '')
      .replace(/"?\}?$/g, '')
      .replace(/^["'\[]*/g, '')
      .replace(/["'\]]*$/g, '')
      .trim()
      .toLowerCase();
  }

  const validModes = ['bus', 'taxi', 'keke', 'okada', 'walk'];
  if (validModes.includes(cleanMode)) {
    return cleanMode as 'bus' | 'taxi' | 'keke' | 'okada' | 'walk';
  }

  if (cleanMode === 'walking') return 'walk';
  if (cleanMode === 'car') return 'taxi';
  if (cleanMode === 'tricycle') return 'keke';
  if (cleanMode === 'motorcycle' || cleanMode === 'bike') return 'okada';

  return 'bus';
}

/**
 * Transform database steps to frontend format
 */
function transformSteps(steps: any[], routeTransportModes?: string[]): any[] {
  // Clean the route's transport modes if provided
  const allModes = routeTransportModes?.map(cleanTransportMode) || [];

  return steps.map((step, index) => ({
    order: step.stepOrder || step.order || index + 1,
    fromLocation: step.fromLocation?.name || step.fromLocation || 'Start',
    toLocation: step.toLocation?.name || step.toLocation || 'End',
    transportMode: cleanTransportMode(step.transportMode),
    transportModes: allModes.length > 0 ? allModes : [cleanTransportMode(step.transportMode)], // All available modes
    instructions: step.instructions || '',
    duration: Number(step.duration || step.estimatedDuration || 0) * 60, // Convert to seconds
    distance: Number(step.distance || 0) * 1000, // Convert km to meters
    estimatedFare: step.estimatedFare ? Number(step.estimatedFare) : undefined,
  }));
}

export interface BidirectionalRouteResult {
  id?: string; // Frontend expects 'id'
  routeName: string;
  source: 'database';
  distance: number; // in meters
  duration: number; // in seconds
  minFare?: number;
  maxFare?: number;
  steps: any[];
  confidence: number;
  isReversed: boolean;
}

export interface BidirectionalSegmentResult {
  segment: RouteSegment;
  isReversed: boolean;
}

@Injectable()
export class BidirectionalRouteService {
  constructor(
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    @InjectRepository(RouteSegment)
    private segmentRepository: Repository<RouteSegment>,
  ) {}

  /**
   * Find routes in BOTH directions (A → B and B → A)
   */
  async findBidirectionalRoutes(
    startLocationId: string,
    endLocationId: string,
    startLocationName: string,
    endLocationName: string,
  ): Promise<BidirectionalRouteResult[]> {
    const routes: BidirectionalRouteResult[] = [];

    // Try forward direction (A → B)
    const forwardRoutes = await this.routeRepository.find({
      where: {
        startLocationId,
        endLocationId,
        isActive: true,
      },
      relations: ['steps', 'startLocation', 'endLocation'],
      order: { popularityScore: 'DESC' },
      take: 3,
    });

    for (const route of forwardRoutes) {
      routes.push({
        id: route.id, // Frontend expects 'id'
        routeName: route.name,
        source: 'database',
        distance: Number(route.distance) * 1000, // Convert km to meters
        duration: Number(route.estimatedDuration) * 60, // Convert minutes to seconds
        minFare: route.minFare ? floorToNearest50(Number(route.minFare)) : undefined,
        maxFare: route.maxFare ? ceilToNearest50(Number(route.maxFare)) : undefined,
        steps: transformSteps(route.steps, route.transportModes),
        confidence: 95,
        isReversed: false,
      });
    }

    // Try reverse direction (B → A) if no forward routes found
    if (routes.length === 0) {
      logger.info('No forward routes found, trying reverse direction', {
        reverseStart: endLocationName,
        reverseEnd: startLocationName,
      });

      const reverseRoutes = await this.routeRepository.find({
        where: {
          startLocationId: endLocationId,
          endLocationId: startLocationId,
          isActive: true,
        },
        relations: ['steps', 'startLocation', 'endLocation'],
        order: { popularityScore: 'DESC' },
        take: 3,
      });

      for (const route of reverseRoutes) {
        const reversedRoute = this.reverseRoute(route, startLocationName, endLocationName);
        routes.push(reversedRoute);
      }
    }

    return routes;
  }

  /**
   * Find segment in both directions
   */
  async findBidirectionalSegment(
    startLocationId: string,
    endLocationId: string,
  ): Promise<BidirectionalSegmentResult | null> {
    // Try forward
    let segment = await this.segmentRepository.findOne({
      where: {
        startLocationId,
        endLocationId,
        isActive: true,
      },
      relations: ['startLocation', 'endLocation'],
    });

    if (segment) {
      return { segment, isReversed: false };
    }

    // Try reverse
    segment = await this.segmentRepository.findOne({
      where: {
        startLocationId: endLocationId,
        endLocationId: startLocationId,
        isActive: true,
      },
      relations: ['startLocation', 'endLocation'],
    });

    if (segment) {
      return { segment: this.reverseSegment(segment), isReversed: true };
    }

    return null;
  }

  /**
   * Reverse a route for bidirectional support
   */
  reverseRoute(
    route: Route,
    newStartName: string,
    newEndName: string,
  ): BidirectionalRouteResult {
    logger.info('Reversing route', {
      originalRoute: route.name,
      newDirection: `${newStartName} → ${newEndName}`,
    });

    // Reverse the route name
    const reversedName = `${newStartName} to ${newEndName}`;

    // Clean the route's transport modes
    const allModes = (route.transportModes || []).map(cleanTransportMode);

    // Reverse and transform steps
    const reversedSteps = [...route.steps]
      .reverse()
      .map((step, index) => {
        // Extract location names (handle both string and Location object)
        const fromLoc = step.toLocation?.name || step.toLocation || 'Start';
        const toLoc = step.fromLocation?.name || step.fromLocation || 'End';

        return {
          order: index + 1,
          fromLocation: fromLoc,
          toLocation: toLoc,
          transportMode: cleanTransportMode(step.transportMode),
          transportModes: allModes.length > 0 ? allModes : [cleanTransportMode(step.transportMode)],
          instructions: this.reverseInstructions(step.instructions),
          duration: Number(step.duration || step.estimatedDuration || 0) * 60,
          distance: Number(step.distance || 0) * 1000,
          estimatedFare: step.estimatedFare ? Number(step.estimatedFare) : undefined,
        };
      });

    return {
      id: route.id, // Frontend expects 'id'
      routeName: reversedName,
      source: 'database',
      distance: Number(route.distance) * 1000, // Convert km to meters
      duration: Number(route.estimatedDuration) * 60, // Convert minutes to seconds
      minFare: route.minFare ? floorToNearest50(Number(route.minFare)) : undefined,
      maxFare: route.maxFare ? ceilToNearest50(Number(route.maxFare)) : undefined,
      steps: reversedSteps,
      confidence: 92, // Slightly lower confidence for reversed routes
      isReversed: true,
    };
  }

  /**
   * Reverse a segment
   */
  reverseSegment(segment: RouteSegment): RouteSegment {
    return {
      ...segment,
      name: `${segment.endLocation?.name} to ${segment.startLocation?.name}`,
      startLocation: segment.endLocation,
      endLocation: segment.startLocation,
      startLocationId: segment.endLocationId,
      endLocationId: segment.startLocationId,
      // Reverse intermediate stops
      intermediateStops: segment.intermediateStops
        ? [...segment.intermediateStops].reverse().map((stop, index) => ({
            ...stop,
            order: index + 1,
          }))
        : [],
      // Reverse landmarks
      landmarks: segment.landmarks ? ([...segment.landmarks].reverse() as any) : [],
      // Reverse instructions
      instructions: this.reverseInstructions(segment.instructions),
    };
  }

  /**
   * Reverse instructions intelligently
   */
  reverseInstructions(instructions: string): string {
    if (!instructions) return '';

    // Replace directional terms
    let reversed = instructions
      // Swap "From X to Y" → "From Y to X"
      .replace(/From (.+?) to (.+?):/gi, 'From $2 to $1:')
      .replace(/from (.+?) to (.+?):/gi, 'from $2 to $1:')

      // Swap start/end references
      .replace(/At the starting point/gi, 'At the destination')
      .replace(/At (.+?) \(start\)/gi, 'At $1 (destination)')

      // Swap boarding/alighting
      .replace(/board (at|any vehicle going to) "(.+?)"/gi, (match, prep, location) => {
        // Keep original if it's a through-location
        return match;
      })

      // Reverse landmark sequences
      .replace(/after passing (.+?) and (.+?),/gi, 'after passing $2 and $1,')

      // Update direction indicators
      .replace(/heading towards (.+?)$/gim, (match, dest) => {
        // Try to infer reverse destination
        return match; // Keep as is for now
      });

    // Add note that route was reversed
    reversed = `**Note:** This route has been automatically reversed from the original direction.\n\n${reversed}`;

    return reversed;
  }
}