// src/modules/route/services/intelligent-route.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from '../entities/route.entity';
import { RouteSegment } from '../entities/route-segment.entity';
import { Location } from '../../location/entities/location.entity';

interface RouteComposition {
  segments: RouteSegment[];
  totalDistance: number;
  totalDuration: number;
  minFare: number;
  maxFare: number;
  instructions: string[];
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
   * Find optimal route by composing segments
   * Example: Choba to Mile1 might use segment "Choba-Rumuokoro" + "Rumuokoro-Mile1"
   */
  async composeRoute(
    startLocationId: string,
    endLocationId: string,
  ): Promise<RouteComposition | null> {
    // Try direct segment first
    const directSegment = await this.segmentRepository.findOne({
      where: {
        startLocationId,
        endLocationId,
        isActive: true,
      },
    });

    if (directSegment) {
      return {
        segments: [directSegment],
        totalDistance: Number(directSegment.distance),
        totalDuration: Number(directSegment.estimatedDuration),
        minFare: Number(directSegment.minFare || 0),
        maxFare: Number(directSegment.maxFare || 0),
        instructions: [directSegment.instructions],
      };
    }

    // Find multi-segment route (simplified BFS approach)
    const route = await this.findMultiSegmentRoute(startLocationId, endLocationId);
    return route;
  }

  /**
   * Find routes that share segments
   * Example: If someone takes the Rumuokoro-Mile1 bus and wants to stop at Eliozu,
   * we can tell them which buses pass through Eliozu
   */
  async findRoutesPassingThrough(
    startLocationId: string,
    endLocationId: string,
    throughLocationId: string,
  ): Promise<Route[]> {
    // Find segments that pass through the location
    const segments = await this.segmentRepository
      .createQueryBuilder('segment')
      .where(
        `segment.intermediateStops @> :stop`,
        { stop: JSON.stringify([{ locationId: throughLocationId }]) }
      )
      .andWhere('segment.isActive = :isActive', { isActive: true })
      .getMany();

    const routes = await this.routeRepository
      .createQueryBuilder('route')
      .leftJoinAndSelect('route.steps', 'steps')
      .where('route.startLocationId = :startLocationId', { startLocationId })
      .andWhere('route.endLocationId = :endLocationId', { endLocationId })
      .andWhere('route.isActive = :isActive', { isActive: true })
      .getMany();

    return routes;
  }

  /**
   * Suggest alternative stops on the same route
   * Example: "Instead of stopping at Rumuokoro, continue to Eliozu for cheaper fare"
   */
  async suggestAlternativeStops(segmentId: string) {
    const segment = await this.segmentRepository.findOne({
      where: { id: segmentId },
    });

    if (!segment) return [];

    const alternatives: AlternativeStop[] = [];

    // Get intermediate stops
    for (const stop of segment.intermediateStops) {
    if (!stop.locationId) continue; // This ensures locationId is string
    
    const partialDistance = this.calculatePartialDistance(segment, stop.locationId);
    const partialFare = this.estimateFare(partialDistance, segment);

    alternatives.push({
      locationId: stop.locationId, // Now guaranteed to be string
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
  async recordSegmentUsage(segmentId: string) {
    await this.segmentRepository.increment({ id: segmentId }, 'usageCount', 1);
  }

  /**
   * Get popular segments for a city
   */
  async getPopularSegments(city: string, limit: number = 20) {
    return this.segmentRepository
      .createQueryBuilder('segment')
      .leftJoin('locations', 'loc', 'segment.startLocationId = loc.id')
      .where('loc.city = :city', { city })
      .andWhere('segment.isActive = :isActive', { isActive: true })
      .orderBy('segment.usageCount', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Private helper: Find multi-segment route using BFS
   */
  private async findMultiSegmentRoute(
    startId: string,
    endId: string,
  ): Promise<RouteComposition | null> {
    // Queue: [currentLocationId, segments used, visited locations]
    const queue: Array<[string, RouteSegment[], Set<string>]> = [
      [startId, [], new Set([startId])],
    ];
    const maxDepth = 3; // Maximum 3 segments in a route

    while (queue.length > 0) {
      const [currentId, usedSegments, visited] = queue.shift()!;

      if (usedSegments.length >= maxDepth) continue;

      // Find segments starting from current location
      const nextSegments = await this.segmentRepository.find({
        where: {
          startLocationId: currentId,
          isActive: true,
        },
      });

      for (const segment of nextSegments) {
        // Check if we reached destination
        if (segment.endLocationId === endId) {
          const finalSegments = [...usedSegments, segment];
          return this.buildRouteComposition(finalSegments);
        }

        // Add to queue if not visited
        if (!visited.has(segment.endLocationId)) {
          const newVisited = new Set(visited);
          newVisited.add(segment.endLocationId);
          queue.push([segment.endLocationId, [...usedSegments, segment], newVisited]);
        }
      }
    }

    return null; // No route found
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
   * Calculate partial distance for intermediate stops
   */
  private calculatePartialDistance(segment: RouteSegment, stopLocationId: string): number {
    const stopIndex = segment.intermediateStops.findIndex(s => s.locationId === stopLocationId);
    if (stopIndex === -1) return Number(segment.distance);

    // Rough estimate: proportional to stop position
    const proportion = (stopIndex + 1) / (segment.intermediateStops.length + 1);
    return Number(segment.distance) * proportion;
  }

  /**
   * Estimate fare based on distance
   */
  private estimateFare(distance: number, segment: RouteSegment): number {
    if (!segment.maxFare) return 0;
    
    const fullDistance = Number(segment.distance);
    const fullFare = Number(segment.maxFare);
    
    return (distance / fullDistance) * fullFare;
  }
}