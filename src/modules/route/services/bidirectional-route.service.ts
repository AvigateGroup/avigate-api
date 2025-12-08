// src/modules/route/services/bidirectional-route.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from '../entities/route.entity';
import { RouteSegment } from '../entities/route-segment.entity';
import { logger } from '@/utils/logger.util';

export interface BidirectionalRouteResult {
  routeId?: string;
  routeName: string;
  source: 'database';
  distance: number;
  duration: number;
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
        routeId: route.id,
        routeName: route.name,
        source: 'database',
        distance: Number(route.distance),
        duration: Number(route.estimatedDuration),
        minFare: route.minFare ? Number(route.minFare) : undefined,
        maxFare: route.maxFare ? Number(route.maxFare) : undefined,
        steps: route.steps,
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

    // Reverse steps
    const reversedSteps = [...route.steps]
      .reverse()
      .map((step, index) => ({
        ...step,
        order: index + 1,
        // Swap from/to locations
        fromLocation: step.toLocation,
        toLocation: step.fromLocation,
        // Reverse instructions if possible
        instructions: this.reverseInstructions(step.instructions),
      }));

    return {
      routeId: route.id,
      routeName: reversedName,
      source: 'database',
      distance: Number(route.distance),
      duration: Number(route.estimatedDuration),
      minFare: route.minFare ? Number(route.minFare) : undefined,
      maxFare: route.maxFare ? Number(route.maxFare) : undefined,
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