// src/modules/route/services/route-matching.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from '../../location/entities/location.entity';
import { Route } from '../entities/route.entity';
import { RouteSegment } from '../entities/route-segment.entity';
import { GoogleMapsService } from './google-maps.service';
import { GeofencingService } from './geofencing.service';
import { IntermediateStopHandlerService } from './intermediate-stop-handler.service';
import { logger } from '@/utils/logger.util';

export interface EnhancedRouteResult {
  hasDirectRoute: boolean;
  hasIntermediateStop: boolean;
  routes: Array<{
    routeId?: string;
    routeName: string;
    source: 'database' | 'google_maps' | 'intermediate_stop';
    distance: number;
    duration: number;
    minFare?: number;
    maxFare?: number;
    steps: any[];
    confidence: number;
    intermediateStopInfo?: {
      segmentName: string;
      stopName: string;
      stopOrder: number;
      partialFare: number;
      instructions: string;
    };
  }>;
}

@Injectable()
export class RouteMatchingService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    @InjectRepository(RouteSegment)
    private segmentRepository: Repository<RouteSegment>,
    private googleMapsService: GoogleMapsService,
    private geofencingService: GeofencingService,
    private intermediateStopHandler: IntermediateStopHandlerService,
  ) {}

  /**
   * Enhanced route finding with intermediate stop support
   */
  async findEnhancedRoutes(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    endLocationName?: string,
  ): Promise<EnhancedRouteResult> {
    logger.info('Finding enhanced routes with intermediate stop support', {
      startLat,
      startLng,
      endLat,
      endLng,
      endLocationName,
    });

    const result: EnhancedRouteResult = {
      hasDirectRoute: false,
      hasIntermediateStop: false,
      routes: [],
    };

    // Step 1: Find nearest locations to start and end points
    const startLocation = await this.findNearestLocation(startLat, startLng);
    const endLocation = await this.findNearestLocation(endLat, endLng);

    // Step 2: Check for direct routes in database
    if (startLocation && endLocation) {
      const dbRoutes = await this.routeRepository.find({
        where: {
          startLocationId: startLocation.id,
          endLocationId: endLocation.id,
          isActive: true,
        },
        relations: ['steps', 'startLocation', 'endLocation'],
        order: { popularityScore: 'DESC' },
        take: 3,
      });

      if (dbRoutes.length > 0) {
        result.hasDirectRoute = true;
        for (const route of dbRoutes) {
          result.routes.push({
            routeId: route.id,
            routeName: route.name,
            source: 'database',
            distance: Number(route.distance),
            duration: Number(route.estimatedDuration),
            minFare: route.minFare ? Number(route.minFare) : undefined,
            maxFare: route.maxFare ? Number(route.maxFare) : undefined,
            steps: route.steps,
            confidence: 95,
          });
        }
      }
    }

    // Step 3: Check if destination is an intermediate stop on any segment
    if (!result.hasDirectRoute || result.routes.length === 0) {
      logger.info('No direct route found, checking intermediate stops');
      
      const intermediateResult = await this.intermediateStopHandler.findSegmentContainingDestination(
        endLat,
        endLng,
        endLocationName,
      );

      if (intermediateResult?.isOnRoute) {
        result.hasIntermediateStop = true;
        
        // Now find routes from start to the segment's start
        const segmentStartLocation = await this.locationRepository.findOne({
          where: { id: intermediateResult.segment.startLocationId },
        });

        if (segmentStartLocation && startLocation) {
          // Check if we have a route to the segment start
          const routesToSegmentStart = await this.routeRepository.find({
            where: {
              startLocationId: startLocation.id,
              endLocationId: segmentStartLocation.id,
              isActive: true,
            },
            relations: ['steps', 'startLocation', 'endLocation'],
          });

          if (routesToSegmentStart.length > 0) {
            // Build route: Start → Segment Start, then Segment Start → Intermediate Stop
            for (const routeToSegmentStart of routesToSegmentStart) {
              result.routes.push({
                routeName: `${startLocation.name} to ${intermediateResult.stopInfo.name} (via ${segmentStartLocation.name})`,
                source: 'intermediate_stop',
                distance: Number(routeToSegmentStart.distance) + intermediateResult.stopInfo.distanceFromStart,
                duration: Number(routeToSegmentStart.estimatedDuration) + 
                         Math.round(intermediateResult.stopInfo.distanceFromStart * 2), // rough estimate
                minFare: (routeToSegmentStart.minFare ? Number(routeToSegmentStart.minFare) : 0) + 
                        intermediateResult.stopInfo.estimatedFare,
                maxFare: (routeToSegmentStart.maxFare ? Number(routeToSegmentStart.maxFare) : 0) + 
                        intermediateResult.stopInfo.estimatedFare,
                steps: [
                  ...routeToSegmentStart.steps,
                  {
                    order: routeToSegmentStart.steps.length + 1,
                    fromLocation: segmentStartLocation.name,
                    toLocation: intermediateResult.stopInfo.name,
                    transportMode: intermediateResult.segment.transportModes[0],
                    instructions: intermediateResult.instructions,
                    duration: Math.round(intermediateResult.stopInfo.distanceFromStart * 2),
                    distance: intermediateResult.stopInfo.distanceFromStart,
                    estimatedFare: intermediateResult.stopInfo.estimatedFare,
                  },
                ],
                confidence: 85,
                intermediateStopInfo: {
                  segmentName: intermediateResult.segment.name,
                  stopName: intermediateResult.stopInfo.name,
                  stopOrder: intermediateResult.stopInfo.order,
                  partialFare: intermediateResult.stopInfo.estimatedFare,
                  instructions: intermediateResult.instructions,
                },
              });
            }
          } else {
            // Direct to segment start, then intermediate stop
            // Check if start location IS the segment start
            const distanceToSegmentStart = this.geofencingService.calculateDistance(
              { lat: startLat, lng: startLng },
              { 
                lat: Number(segmentStartLocation.latitude), 
                lng: Number(segmentStartLocation.longitude) 
              },
            ) / 1000;

            if (distanceToSegmentStart < 1) {
              // User is already at segment start!
              result.routes.push({
                routeName: `Direct to ${intermediateResult.stopInfo.name}`,
                source: 'intermediate_stop',
                distance: intermediateResult.stopInfo.distanceFromStart,
                duration: Math.round(intermediateResult.stopInfo.distanceFromStart * 2),
                minFare: intermediateResult.stopInfo.estimatedFare * 0.8,
                maxFare: intermediateResult.stopInfo.estimatedFare,
                steps: [
                  {
                    order: 1,
                    fromLocation: segmentStartLocation.name,
                    toLocation: intermediateResult.stopInfo.name,
                    transportMode: intermediateResult.segment.transportModes[0],
                    instructions: intermediateResult.instructions,
                    duration: Math.round(intermediateResult.stopInfo.distanceFromStart * 2),
                    distance: intermediateResult.stopInfo.distanceFromStart,
                    estimatedFare: intermediateResult.stopInfo.estimatedFare,
                  },
                ],
                confidence: 90,
                intermediateStopInfo: {
                  segmentName: intermediateResult.segment.name,
                  stopName: intermediateResult.stopInfo.name,
                  stopOrder: intermediateResult.stopInfo.order,
                  partialFare: intermediateResult.stopInfo.estimatedFare,
                  instructions: intermediateResult.instructions,
                },
              });
            }
          }
        }

        logger.info('Found intermediate stop route', {
          stopName: intermediateResult.stopInfo.name,
          segmentName: intermediateResult.segment.name,
        });
      }
    }

    // Step 4: Get Google Maps route as fallback
    if (result.routes.length === 0) {
      logger.info('No database or intermediate routes found, using Google Maps');
      
      try {
        const googleRoute = await this.googleMapsService.getDirections(
          { lat: startLat, lng: startLng },
          { lat: endLat, lng: endLng },
          'transit',
        );

        result.routes.push({
          routeName: 'Google Maps Route',
          source: 'google_maps',
          distance: googleRoute.distance,
          duration: googleRoute.duration,
          steps: googleRoute.steps,
          confidence: 70,
        });
      } catch (error) {
        logger.error('Failed to get Google Maps route:', error);
      }
    }

    // Step 5: Sort by confidence and duration
    result.routes.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return a.duration - b.duration;
    });

    return result;
  }

  /**
   * Find nearest location to coordinates
   */
  private async findNearestLocation(
    lat: number,
    lng: number,
    radiusKm: number = 2,
  ): Promise<Location | null> {
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

    const locations = await this.locationRepository
      .createQueryBuilder('location')
      .where('location.latitude BETWEEN :minLat AND :maxLat', {
        minLat: lat - latDelta,
        maxLat: lat + latDelta,
      })
      .andWhere('location.longitude BETWEEN :minLng AND :maxLng', {
        minLng: lng - lngDelta,
        maxLng: lng + lngDelta,
      })
      .andWhere('location.isActive = :isActive', { isActive: true })
      .getMany();

    if (locations.length === 0) return null;

    let nearest: Location | null = null;
    let minDistance = Infinity;

    for (const location of locations) {
      const distance = this.geofencingService.calculateDistance(
        { lat, lng },
        { lat: Number(location.latitude), lng: Number(location.longitude) },
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = location;
      }
    }

    return nearest;
  }

  /**
   * Search for location by name (handles intermediate stops)
   */
  async searchLocationByName(searchQuery: string): Promise<{
    exactMatches: Location[];
    intermediateStops: Array<{
      stopName: string;
      segmentName: string;
      coordinates: { lat: number; lng: number };
    }>;
  }> {
    // Search exact locations
    const exactMatches = await this.locationRepository
      .createQueryBuilder('location')
      .where('LOWER(location.name) LIKE LOWER(:query)', { 
        query: `%${searchQuery}%` 
      })
      .andWhere('location.isActive = :isActive', { isActive: true })
      .take(10)
      .getMany();

    // Search intermediate stops
    const segments = await this.segmentRepository.find({
      where: { isActive: true },
    });

    const intermediateStops: Array<{
      stopName: string;
      segmentName: string;
      coordinates: { lat: number; lng: number };
    }> = [];

    for (const segment of segments) {
      if (segment.intermediateStops && segment.intermediateStops.length > 0) {
        for (const stop of segment.intermediateStops) {
          if (stop.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            // Estimate coordinates based on position in route
            const startLat = Number(segment.startLocation?.latitude);
            const startLng = Number(segment.startLocation?.longitude);
            const endLat = Number(segment.endLocation?.latitude);
            const endLng = Number(segment.endLocation?.longitude);
            
            const ratio = stop.order / (segment.intermediateStops.length + 1);
            
            intermediateStops.push({
              stopName: stop.name,
              segmentName: segment.name,
              coordinates: {
                lat: startLat + (endLat - startLat) * ratio,
                lng: startLng + (endLng - startLng) * ratio,
              },
            });
          }
        }
      }
    }

    return {
      exactMatches,
      intermediateStops,
    };
  }
}