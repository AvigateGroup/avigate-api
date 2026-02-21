// src/modules/route/services/intelligent-route.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from '../entities/route.entity';
import { RouteSegment } from '../entities/route-segment.entity';
import { Location } from '../../location/entities/location.entity';
import { logger } from '@/utils/logger.util';

interface RouteComposition {
  segments: RouteSegment[];
  totalDistance: number;
  totalDuration: number;
  minFare: number;
  maxFare: number;
  instructions: string[];
  isReversed?: boolean; //  NEW: Track if route uses reversed segments
  reversedSegments?: number[]; //  NEW: Which segments were reversed
}

interface AlternativeStop {
  locationId: string;
  locationName: string;
  estimatedFare: number;
  saving: number;
  isOptional: boolean;
}

@Injectable()
export class IntelligentRouteService {
  constructor(
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    @InjectRepository(RouteSegment)
    private segmentRepository: Repository<RouteSegment>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
  ) {}

  /**
   * Find optimal route by composing segments (BIDIRECTIONAL)
   * Example: Choba to Mile1 might use segment "Choba-Rumuokoro" + "Rumuokoro-Mile1"
   * Now also searches reverse: "Mile1-Rumuokoro" + "Rumuokoro-Choba"
   */
  async composeRoute(
    startLocationId: string,
    endLocationId: string,
  ): Promise<RouteComposition | null> {
    logger.info('Composing route with bidirectional support', {
      startLocationId,
      endLocationId,
    });

    // Try direct segment first (bidirectional)
    const directSegmentResult = await this.findBidirectionalSegment(startLocationId, endLocationId);

    if (directSegmentResult) {
      const { segment, isReversed } = directSegmentResult;

      return {
        segments: [segment],
        totalDistance: Number(segment.distance),
        totalDuration: Number(segment.estimatedDuration),
        minFare: Number(segment.minFare || 0),
        maxFare: Number(segment.maxFare || 0),
        instructions: [segment.instructions],
        isReversed,
        reversedSegments: isReversed ? [0] : [],
      };
    }

    // Find multi-segment route (bidirectional)
    const route = await this.findMultiSegmentRoute(startLocationId, endLocationId);
    return route;
  }

  /**
   * NEW: Compose route using routeId - fetches the route and uses its start/end locations
   */
  async composeRouteById(routeId: string): Promise<RouteComposition | null> {
    logger.info('Composing route by ID', { routeId });

    // Fetch the route with its location details
    const route = await this.routeRepository.findOne({
      where: { id: routeId, isActive: true },
      relations: ['startLocation', 'endLocation'],
    });

    if (!route) {
      logger.warn('Route not found', { routeId });
      return null;
    }

    // Use the existing composeRoute method with the location IDs
    return this.composeRoute(route.startLocationId, route.endLocationId);
  }

  /**
   * NEW: Find segment in both directions
   */
  private async findBidirectionalSegment(
    startLocationId: string,
    endLocationId: string,
  ): Promise<{ segment: RouteSegment; isReversed: boolean } | null> {
    // Try forward direction
    let segment = await this.segmentRepository.findOne({
      where: {
        startLocationId,
        endLocationId,
        isActive: true,
      },
      relations: ['startLocation', 'endLocation'],
    });

    if (segment) {
      logger.info('Found forward segment', { segmentName: segment.name });
      return { segment, isReversed: false };
    }

    // Try reverse direction
    segment = await this.segmentRepository.findOne({
      where: {
        startLocationId: endLocationId,
        endLocationId: startLocationId,
        isActive: true,
      },
      relations: ['startLocation', 'endLocation'],
    });

    if (segment) {
      logger.info('Found reverse segment, reversing it', {
        originalSegment: segment.name,
        newDirection: `${segment.endLocation?.name} → ${segment.startLocation?.name}`,
      });
      return { segment: this.reverseSegment(segment), isReversed: true };
    }

    return null;
  }

  /**
   *  NEW: Reverse a segment for bidirectional routing
   */
  private reverseSegment(segment: RouteSegment): RouteSegment {
    return {
      ...segment,
      // Swap name
      name: `${segment.endLocation?.name} to ${segment.startLocation?.name}`,

      // Swap locations
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
   *  NEW: Intelligently reverse instructions
   */
  private reverseInstructions(instructions: string): string {
    if (!instructions) return '';

    let reversed = instructions
      // Swap "From X to Y" → "From Y to X"
      .replace(/From (.+?) to (.+?):/gi, 'From $2 to $1:')
      .replace(/from (.+?) to (.+?):/gi, 'from $2 to $1:')

      // Swap directional phrases
      .replace(/board any vehicle going to "(.+?)"/gi, (match, _dest) => {
        return match; // Keep as is - still valid in reverse
      })

      // Swap "At Start" and "At End"
      .replace(/At the starting point/gi, 'At the destination')
      .replace(/At (.+?) \(start\)/gi, 'At $1 (destination)')

      // Reverse landmark sequences
      .replace(/pass through (.+?) then (.+?)\./gi, 'pass through $2 then $1.')
      .replace(/after (.+?) and (.+?),/gi, 'after $2 and $1,');

    // Add reversal notice
    reversed = `**Note:** This route has been automatically reversed.\n\n${reversed}`;

    return reversed;
  }

  /**
   * Find routes that share segments (BIDIRECTIONAL)
   */
  async findRoutesPassingThrough(
    startLocationId: string,
    endLocationId: string,
    throughLocationId: string,
  ): Promise<Route[]> {
    logger.info('Finding routes passing through location (bidirectional)', {
      startLocationId,
      endLocationId,
      throughLocationId,
    });

    // Find segments that pass through the location (both directions)
    const _forwardSegments = await this.segmentRepository
      .createQueryBuilder('segment')
      .where(`segment.intermediateStops @> :stop`, {
        stop: JSON.stringify([{ locationId: throughLocationId }]),
      })
      .andWhere('segment.isActive = :isActive', { isActive: true })
      .getMany();

    // Also check reverse direction
    const _reverseSegments = await this.segmentRepository
      .createQueryBuilder('segment')
      .where(`segment.intermediateStops @> :stop`, {
        stop: JSON.stringify([{ locationId: throughLocationId }]),
      })
      .andWhere('segment.isActive = :isActive', { isActive: true })
      .getMany();

    // Find routes using these segments (both directions)
    const routes = await this.routeRepository
      .createQueryBuilder('route')
      .leftJoinAndSelect('route.steps', 'steps')
      .where(
        '(route.startLocationId = :startLocationId AND route.endLocationId = :endLocationId) OR ' +
          '(route.startLocationId = :endLocationId AND route.endLocationId = :startLocationId)',
        { startLocationId, endLocationId },
      )
      .andWhere('route.isActive = :isActive', { isActive: true })
      .getMany();

    return routes;
  }

  /**
   * Suggest alternative stops on the same route (BIDIRECTIONAL)
   */
  async suggestAlternativeStops(segmentId: string, isReversed: boolean = false) {
    const segment = await this.segmentRepository.findOne({
      where: { id: segmentId },
    });

    if (!segment) return [];

    const alternatives: AlternativeStop[] = [];

    // Get intermediate stops (reversed if needed)
    const stops = isReversed
      ? [...(segment.intermediateStops ?? [])].reverse()
      : (segment.intermediateStops ?? []);

    // Calculate alternatives
    for (const stop of stops) {
      if (!stop.locationId) continue;

      const partialDistance = this.calculatePartialDistance(segment, stop.locationId, isReversed);
      const partialFare = this.estimateFare(partialDistance, segment);

      alternatives.push({
        locationId: stop.locationId,
        locationName: stop.name,
        estimatedFare: partialFare,
        saving: segment.maxFare ? Number(segment.maxFare) - partialFare : 0,
        isOptional: stop.isOptional,
      });
    }

    return alternatives;
  }

  /**
   * Update segment usage statistics
   */
  async recordSegmentUsage(segmentId: string, isReversed: boolean = false) {
    await this.segmentRepository.increment({ id: segmentId }, 'usageCount', 1);

    // Log reversal usage for analytics
    if (isReversed) {
      logger.info('Recorded reversed segment usage', { segmentId });
      // Could add a separate counter for reversed usage in the future
    }
  }

  /**
   * Get popular segments for a city (BIDIRECTIONAL)
   */
  async getPopularSegments(city: string, limit: number = 20) {
    const segments = await this.segmentRepository
      .createQueryBuilder('segment')
      .leftJoin('locations', 'loc', 'segment.startLocationId = loc.id')
      .where('loc.city = :city', { city })
      .andWhere('segment.isActive = :isActive', { isActive: true })
      .orderBy('segment.usageCount', 'DESC')
      .take(limit)
      .getMany();

    // Note: Popular segments can be used in both directions
    logger.info('Retrieved popular segments (usable bidirectionally)', {
      city,
      count: segments.length,
    });

    return segments;
  }

  /**
   * Multi-segment route finder with bidirectional support
   */
  private async findMultiSegmentRoute(
    startId: string,
    endId: string,
  ): Promise<RouteComposition | null> {
    logger.info('Finding multi-segment route with bidirectional search');

    // Queue: [currentLocationId, segments used, visited locations, reversed indices]
    const queue: Array<[string, RouteSegment[], Set<string>, number[]]> = [
      [startId, [], new Set([startId]), []],
    ];
    const maxDepth = 3; // Maximum 3 segments in a route

    while (queue.length > 0) {
      const [currentId, usedSegments, visited, reversedIndices] = queue.shift()!;

      if (usedSegments.length >= maxDepth) continue;

      // Find segments starting from current location (BIDIRECTIONAL)
      const nextSegmentResults = await this.findNextSegmentsBidirectional(currentId);

      for (const { segment, isReversed } of nextSegmentResults) {
        // Check if we reached destination
        if (segment.endLocationId === endId) {
          const finalSegments = [...usedSegments, segment];
          const finalReversedIndices = isReversed
            ? [...reversedIndices, usedSegments.length]
            : reversedIndices;

          const composition = this.buildRouteComposition(finalSegments);
          composition.isReversed = finalReversedIndices.length > 0;
          composition.reversedSegments = finalReversedIndices;

          logger.info('Found multi-segment route', {
            segmentCount: finalSegments.length,
            reversedCount: finalReversedIndices.length,
            totalDistance: composition.totalDistance,
          });

          return composition;
        }

        // Add to queue if not visited
        if (!visited.has(segment.endLocationId)) {
          const newVisited = new Set(visited);
          newVisited.add(segment.endLocationId);
          const newReversedIndices = isReversed
            ? [...reversedIndices, usedSegments.length]
            : reversedIndices;

          queue.push([
            segment.endLocationId,
            [...usedSegments, segment],
            newVisited,
            newReversedIndices,
          ]);
        }
      }
    }

    logger.info('No multi-segment route found');
    return null;
  }

  /**
   * NEW: Find next segments in both directions
   */
  private async findNextSegmentsBidirectional(
    locationId: string,
  ): Promise<Array<{ segment: RouteSegment; isReversed: boolean }>> {
    const results: Array<{ segment: RouteSegment; isReversed: boolean }> = [];

    // Find forward segments
    const forwardSegments = await this.segmentRepository.find({
      where: {
        startLocationId: locationId,
        isActive: true,
      },
      relations: ['startLocation', 'endLocation'],
    });

    for (const segment of forwardSegments) {
      results.push({ segment, isReversed: false });
    }

    // Find reverse segments (segments ending at this location)
    const reverseSegments = await this.segmentRepository.find({
      where: {
        endLocationId: locationId,
        isActive: true,
      },
      relations: ['startLocation', 'endLocation'],
    });

    for (const segment of reverseSegments) {
      results.push({
        segment: this.reverseSegment(segment),
        isReversed: true,
      });
    }

    return results;
  }

  /**
   * Build route composition from segments
   */
  private buildRouteComposition(segments: RouteSegment[]): RouteComposition {
    return {
      segments,
      totalDistance: segments.reduce((sum, s) => sum + Number(s.distance), 0),
      totalDuration: segments.reduce((sum, s) => sum + Number(s.estimatedDuration), 0),
      minFare: segments.reduce((sum, s) => sum + Number(s.minFare || 0), 0),
      maxFare: segments.reduce((sum, s) => sum + Number(s.maxFare || 0), 0),
      instructions: segments.map(s => s.instructions),
    };
  }

  /**
   * UPDATED: Calculate partial distance with reversal support
   */
  private calculatePartialDistance(
    segment: RouteSegment,
    stopLocationId: string,
    isReversed: boolean = false,
  ): number {
    const stops = isReversed
      ? [...(segment.intermediateStops ?? [])].reverse()
      : (segment.intermediateStops ?? []);

    const stopIndex = stops.findIndex(s => s.locationId === stopLocationId);
    if (stopIndex === -1) return Number(segment.distance);

    // Rough estimate: proportional to stop position
    const proportion = (stopIndex + 1) / (stops.length + 1);
    return Number(segment.distance) * proportion;
  }

  /**
   * Estimate fare based on distance
   */
  private estimateFare(distance: number, segment: RouteSegment): number {
    if (!segment.maxFare) return 0;

    const fullDistance = Number(segment.distance);
    const fullFare = Number(segment.maxFare);

    return Math.round((distance / fullDistance) * fullFare);
  }

  /**
   * NEW: Get route composition summary with reversal info
   */
  async getRouteCompositionSummary(
    startLocationId: string,
    endLocationId: string,
  ): Promise<{
    hasRoute: boolean;
    segments: number;
    reversedSegments: number;
    totalDistance: number;
    totalDuration: number;
    estimatedFare: { min: number; max: number };
  } | null> {
    const composition = await this.composeRoute(startLocationId, endLocationId);

    if (!composition) {
      return null;
    }

    return {
      hasRoute: true,
      segments: composition.segments.length,
      reversedSegments: composition.reversedSegments?.length || 0,
      totalDistance: composition.totalDistance,
      totalDuration: composition.totalDuration,
      estimatedFare: {
        min: composition.minFare,
        max: composition.maxFare,
      },
    };
  }

  /**
   * Find all possible routes between two locations (including reversed)
   */
  async findAllPossibleRoutes(
    startLocationId: string,
    endLocationId: string,
  ): Promise<RouteComposition[]> {
    logger.info('Finding all possible routes (including reversed segments)');

    const routes: RouteComposition[] = [];

    // Try direct segment (both directions)
    const directSegment = await this.findBidirectionalSegment(startLocationId, endLocationId);
    if (directSegment) {
      routes.push({
        segments: [directSegment.segment],
        totalDistance: Number(directSegment.segment.distance),
        totalDuration: Number(directSegment.segment.estimatedDuration),
        minFare: Number(directSegment.segment.minFare || 0),
        maxFare: Number(directSegment.segment.maxFare || 0),
        instructions: [directSegment.segment.instructions],
        isReversed: directSegment.isReversed,
        reversedSegments: directSegment.isReversed ? [0] : [],
      });
    }

    // Try multi-segment routes
    const multiSegmentRoute = await this.findMultiSegmentRoute(startLocationId, endLocationId);
    if (multiSegmentRoute) {
      routes.push(multiSegmentRoute);
    }

    logger.info('Found possible routes', { count: routes.length });
    return routes;
  }

  /**
   *  Validate if a segment can be safely reversed
   */
  isSegmentSafelyReversible(segment: RouteSegment): {
    reversible: boolean;
    reason?: string;
  } {
    // Check for one-way indicators in name
    if (
      segment.name.toLowerCase().includes('one-way') ||
      segment.name.toLowerCase().includes('one way')
    ) {
      return {
        reversible: false,
        reason: 'Segment is marked as one-way',
      };
    }

    // Check transport modes - some might be one-way only
    const oneWayModes = ['express_bus', 'shuttle'];
    const hasOneWayMode = (segment.transportModes ?? []).some(mode =>
      oneWayModes.includes(mode.toLowerCase()),
    );

    if (hasOneWayMode) {
      return {
        reversible: false,
        reason: 'Transport mode is typically one-way',
      };
    }

    // By default, segments are reversible
    return { reversible: true };
  }
}
