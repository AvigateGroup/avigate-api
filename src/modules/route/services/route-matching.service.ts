// src/modules/route/services/route-matching.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from '../../location/entities/location.entity';
import { Route } from '../entities/route.entity';
import { RouteSegment } from '../entities/route-segment.entity';
import { Landmark } from '../../location/entities/landmark.entity';
import { GoogleMapsService } from './google-maps.service';
import { GeofencingService } from './geofencing.service';
import { IntermediateStopHandlerService } from './intermediate-stop-handler.service';
import { FinalDestinationHandlerService } from './final-destination-handler.service';
import { logger } from '@/utils/logger.util';

export interface EnhancedRouteResult {
  hasDirectRoute: boolean;
  hasIntermediateStop: boolean;
  requiresWalking: boolean;
  routes: Array<{
    routeId?: string;
    routeName: string;
    source: 'database' | 'google_maps' | 'intermediate_stop' | 'with_walking';
    distance: number;
    duration: number;
    minFare?: number;
    maxFare?: number;
    steps: any[];
    confidence: number;
    intermediateStopInfo?: any;
    finalDestinationInfo?: {
      needsWalking: boolean;
      dropOffLocation: any;
      walkingDirections?: any;
      alternativeTransport?: any;
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
    @InjectRepository(Landmark)
    private landmarkRepository: Repository<Landmark>,
    private googleMapsService: GoogleMapsService,
    private geofencingService: GeofencingService,
    private intermediateStopHandler: IntermediateStopHandlerService,
    private finalDestinationHandler: FinalDestinationHandlerService,
  ) {}

  /**
   * ENHANCED route finding with:
   * 1. Direct routes
   * 2. Intermediate stops
   * 3. Walking from main roads (NEW!)
   */
  async findEnhancedRoutes(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    endLocationName?: string,
  ): Promise<EnhancedRouteResult> {
    logger.info('Finding enhanced routes with final destination handling', {
      startLat,
      startLng,
      endLat,
      endLng,
      endLocationName,
    });

    const result: EnhancedRouteResult = {
      hasDirectRoute: false,
      hasIntermediateStop: false,
      requiresWalking: false,
      routes: [],
    };

    // Step 1: Find nearest locations
    const startLocation = await this.findNearestLocation(startLat, startLng);
    const endLocation = await this.findNearestLocation(endLat, endLng, 0.5); // Smaller radius for end

    // Step 2: Try direct routes
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

        return result; // Have direct routes, return
      }
    }

    // Step 3: Check intermediate stops
    const intermediateResult = await this.intermediateStopHandler.findSegmentContainingDestination(
      endLat,
      endLng,
      endLocationName,
    );

    if (intermediateResult?.isOnRoute) {
      result.hasIntermediateStop = true;
      // ... (existing intermediate stop handling code)
    }

    // Step 4: NEW - Check if destination requires walking from main road
    if (!result.hasDirectRoute && !result.hasIntermediateStop) {
      logger.info('No direct/intermediate routes found, checking if walking needed');

      const walkingRoute = await this.findRouteWithWalking(
        startLat,
        startLng,
        endLat,
        endLng,
        endLocationName,
        startLocation,
      );

      if (walkingRoute) {
        result.requiresWalking = true;
        result.routes.push(walkingRoute);
        return result;
      }
    }

    // Step 5: Fallback to Google Maps
    if (result.routes.length === 0) {
      logger.info('Using Google Maps fallback');
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
          steps: googleRoute.steps.map((step, index) => ({
            order: index + 1,
            instructions: step.instruction,
            distance: step.distance,
            duration: step.duration,
          })),
          confidence: 70,
        });
      } catch (error) {
        logger.error('Google Maps fallback failed:', error);
      }
    }

    return result;
  }

  /**
   * NEW METHOD: Find route that requires walking from main road
   */
  private async findRouteWithWalking(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    endLocationName: string | undefined,
    startLocation: Location | null,
  ): Promise<any | null> {
    // Find segments that pass near the destination
    const nearbySegments = await this.findSegmentsNearDestination(endLat, endLng, 1.5); // 1.5km radius

    if (nearbySegments.length === 0) {
      return null;
    }

    // For each segment, find best drop-off point
    let bestRoute: any = null;
    let shortestWalkingDistance = Infinity;

    for (const segment of nearbySegments) {
      const dropOffPoint = await this.finalDestinationHandler.findBestDropOffPoint(
        segment.id,
        endLat,
        endLng,
      );

      if (!dropOffPoint) continue;

      const walkingDistance = this.geofencingService.calculateDistance(
        { lat: dropOffPoint.dropOffLat, lng: dropOffPoint.dropOffLng },
        { lat: endLat, lng: endLng },
      );

      // Only consider if walking distance is reasonable (< 2km)
      if (walkingDistance > 2000) continue;

      if (walkingDistance < shortestWalkingDistance) {
        shortestWalkingDistance = walkingDistance;

        // Get final destination details
        const finalDestInfo = await this.finalDestinationHandler.handleFinalDestination(
          dropOffPoint.dropOffLat,
          dropOffPoint.dropOffLng,
          endLat,
          endLng,
          endLocationName || 'your destination',
          dropOffPoint.landmark,
        );

        // Build route to segment start, then segment, then walking
        const routeToSegmentStart = startLocation
          ? await this.findRouteToLocation(startLat, startLng, segment.startLocationId)
          : null;

        bestRoute = {
          routeName: `${startLocation?.name || 'Your Location'} to ${endLocationName || 'Destination'} (with walking)`,
          source: 'with_walking',
          distance:
            Number(segment.distance) +
            (routeToSegmentStart?.distance || 0) +
            (finalDestInfo.walkingDirections?.distance || 0) / 1000,
          duration:
            Number(segment.estimatedDuration) +
            (routeToSegmentStart?.duration || 0) +
            (finalDestInfo.walkingDirections?.duration || 0),
          minFare:
            (segment.minFare ? Number(segment.minFare) : 0) + (routeToSegmentStart?.minFare || 0),
          maxFare:
            (segment.maxFare ? Number(segment.maxFare) : 0) + (routeToSegmentStart?.maxFare || 0),
          steps: [
            ...(routeToSegmentStart?.steps || []),
            {
              order: (routeToSegmentStart?.steps.length || 0) + 1,
              fromLocation: segment.startLocation?.name,
              toLocation: dropOffPoint.dropOffName,
              transportMode: segment.transportModes[0],
              instructions: this.enhanceInstructionsWithDropOff(
                segment.instructions,
                dropOffPoint.dropOffName,
              ),
              duration: Number(segment.estimatedDuration),
              distance: Number(segment.distance),
              estimatedFare: segment.maxFare ? Number(segment.maxFare) : undefined,
            },
            {
              order: (routeToSegmentStart?.steps.length || 0) + 2,
              fromLocation: dropOffPoint.dropOffName,
              toLocation: endLocationName || 'Your Destination',
              transportMode: 'walk',
              instructions: finalDestInfo.instructions,
              duration: finalDestInfo.walkingDirections?.duration || 0,
              distance: (finalDestInfo.walkingDirections?.distance || 0) / 1000,
              estimatedFare: 0,
              walkingDirections: finalDestInfo.walkingDirections,
              alternativeTransport: finalDestInfo.alternativeTransport,
            },
          ],
          confidence: 85,
          finalDestinationInfo: finalDestInfo,
        };
      }
    }

    return bestRoute;
  }

  /**
   * Find segments that pass near a destination
   */
  private async findSegmentsNearDestination(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<RouteSegment[]> {
    const segments = await this.segmentRepository.find({
      where: { isActive: true },
      relations: ['startLocation', 'endLocation'],
    });

    const nearbySegments: RouteSegment[] = [];

    for (const segment of segments) {
      // Check if segment passes near the location
      const startLat = Number(segment.startLocation?.latitude);
      const startLng = Number(segment.startLocation?.longitude);
      const endLat = Number(segment.endLocation?.latitude);
      const endLng = Number(segment.endLocation?.longitude);

      const distanceToStart = this.geofencingService.calculateDistance(
        { lat, lng },
        { lat: startLat, lng: startLng },
      );

      const distanceToEnd = this.geofencingService.calculateDistance(
        { lat, lng },
        { lat: endLat, lng: endLng },
      );

      // If destination is near either end or between them
      if (
        distanceToStart / 1000 < radiusKm ||
        distanceToEnd / 1000 < radiusKm ||
        this.isPointNearLine(
          { lat, lng },
          { lat: startLat, lng: startLng },
          { lat: endLat, lng: endLng },
          radiusKm,
        )
      ) {
        nearbySegments.push(segment);
      }
    }

    return nearbySegments;
  }

  /**
   * Check if point is near a line
   */
  private isPointNearLine(
    point: { lat: number; lng: number },
    lineStart: { lat: number; lng: number },
    lineEnd: { lat: number; lng: number },
    toleranceKm: number,
  ): boolean {
    // Simplified check - you can use the one from IntermediateStopHandlerService
    const distanceToStart = this.geofencingService.calculateDistance(point, lineStart) / 1000;
    const distanceToEnd = this.geofencingService.calculateDistance(point, lineEnd) / 1000;
    const lineLength = this.geofencingService.calculateDistance(lineStart, lineEnd) / 1000;

    return (
      distanceToStart + distanceToEnd <= lineLength * 1.2 &&
      Math.min(distanceToStart, distanceToEnd) <= toleranceKm
    );
  }

  /**
   * Find route to a specific location
   */
  private async findRouteToLocation(
    fromLat: number,
    fromLng: number,
    toLocationId: string,
  ): Promise<any | null> {
    const fromLocation = await this.findNearestLocation(fromLat, fromLng);
    if (!fromLocation) return null;

    const routes = await this.routeRepository.find({
      where: {
        startLocationId: fromLocation.id,
        endLocationId: toLocationId,
        isActive: true,
      },
      relations: ['steps'],
      take: 1,
    });

    if (routes.length === 0) return null;

    const route = routes[0];
    return {
      distance: Number(route.distance),
      duration: Number(route.estimatedDuration),
      minFare: route.minFare ? Number(route.minFare) : 0,
      maxFare: route.maxFare ? Number(route.maxFare) : 0,
      steps: route.steps,
    };
  }

  /**
   * Enhance instructions with drop-off landmark
   */
  private enhanceInstructionsWithDropOff(instructions: string, dropOffName: string): string {
    return `${instructions}

**Your Drop-Off Point: ${dropOffName}**
Tell the driver to stop at ${dropOffName}. This is where you'll walk from to reach your final destination.`;
  }


/**
 * ENHANCED: Handle street-level destinations
 * Example: Hotel on Kala Street from Choba
 */
async findRouteWithStreetLevelGuidance(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  endLocationName: string,
): Promise<EnhancedRouteResult> {
  logger.info('Finding route with street-level guidance', {
    destination: endLocationName,
  });

  // 1. Get address details from Google
  const endAddress = await this.googleMapsService.reverseGeocode(endLat, endLng);
  const streetInfo = this.extractStreetInfo(endAddress);

  // 2. Find nearest major stop on main road
  const nearestMainRoadStop = await this.findNearestMainRoadStop(endLat, endLng);

  if (!nearestMainRoadStop) {
    return this.findEnhancedRoutes(startLat, startLng, endLat, endLng, endLocationName);
  }

  // 3. Get route to main road stop
  const routeToMainRoad = await this.findEnhancedRoutes(
    startLat,
    startLng,
    nearestMainRoadStop.lat,
    nearestMainRoadStop.lng,
    nearestMainRoadStop.name,
  );

  if (!routeToMainRoad.routes.length) {
    return routeToMainRoad;
  }

  // 4. Calculate distance from main road to destination
  const distanceToDestination = this.geofencingService.calculateDistance(
    { lat: nearestMainRoadStop.lat, lng: nearestMainRoadStop.lng },
    { lat: endLat, lng: endLng },
  );

  // 5. Get walking directions
  const walkingDirections = await this.googleMapsService.getDirections(
    { lat: nearestMainRoadStop.lat, lng: nearestMainRoadStop.lng },
    { lat: endLat, lng: endLng },
    'walking',
  );

  // 6. Find nearest landmark for drop-off guidance
  const dropOffLandmark = await this.findNearestLandmark(
    nearestMainRoadStop.lat,
    nearestMainRoadStop.lng,
  );

  // 7. Build street-level instructions
  const streetInstructions = this.buildStreetLevelInstructions(
    nearestMainRoadStop.name,
    endLocationName,
    streetInfo,
    distanceToDestination,
    walkingDirections,
    dropOffLandmark,
  );

  // 8. Enhance first route with street guidance
  const enhancedRoute = routeToMainRoad.routes[0];
  enhancedRoute.steps.push({
    order: enhancedRoute.steps.length + 1,
    fromLocation: nearestMainRoadStop.name,
    toLocation: endLocationName,
    transportMode: distanceToDestination > 500 ? 'keke/okada' : 'walk',
    instructions: streetInstructions,
    duration: distanceToDestination > 500 ? 5 : Math.round(walkingDirections.duration),
    distance: distanceToDestination / 1000,
    estimatedFare: distanceToDestination > 500 ? 200 : 0,
    walkingDirections: walkingDirections,
    alternativeTransport: distanceToDestination > 200 ? {
      type: 'okada' as const,
      estimatedFare: Math.min(200, Math.max(100, Math.round(distanceToDestination / 10))),
      instructions: `At ${nearestMainRoadStop.name}, look for okada or keke riders. Tell them: "Take me go ${endLocationName} for ${streetInfo.street}"`,
    } : undefined,
  });

  return {
    hasDirectRoute: false,
    hasIntermediateStop: false,
    requiresWalking: distanceToDestination <= 500,
    routes: [enhancedRoute],
  };
}

/**
 * Extract street information from address
 */
private extractStreetInfo(address: string | null): { street?: string; area?: string } {
  if (!address) return {};

  const parts = address.split(',').map(p => p.trim());
  
  return {
    street: parts[0], // "Kala Street"
    area: parts[1],   // "Rumuobiakani"
  };
}

/**
 * Find nearest major stop on main road
 */
private async findNearestMainRoadStop(
  lat: number,
  lng: number,
): Promise<{ name: string; lat: number; lng: number; locationId: string } | null> {
  // Find locations on major roads (Ikwerre Road, East-West Road)
  const majorStops = await this.locationRepository
    .createQueryBuilder('location')
    .where('location.isActive = :isActive', { isActive: true })
    .andWhere('location.isVerified = :isVerified', { isVerified: true })
    .andWhere(
      `location.description ILIKE '%major%' 
       OR location.description ILIKE '%junction%'
       OR location.description ILIKE '%roundabout%'`,
    )
    .getMany();

  let nearest: typeof majorStops[0] | null = null;
  let minDistance = Infinity;

  for (const stop of majorStops) {
    const distance = this.geofencingService.calculateDistance(
      { lat, lng },
      { lat: Number(stop.latitude), lng: Number(stop.longitude) },
    );

    if (distance < minDistance && distance < 2000) { // Within 2km
      minDistance = distance;
      nearest = stop;
    }
  }

  if (!nearest) return null;

  return {
    name: nearest.name,
    lat: Number(nearest.latitude),
    lng: Number(nearest.longitude),
    locationId: nearest.id,
  };
}

/**
 * Find nearest landmark to help with drop-off
 */
private async findNearestLandmark(
  lat: number,
  lng: number,
): Promise<string | null> {
  const landmarks = await this.landmarkRepository
    .createQueryBuilder('landmark')
    .where('landmark.isVerified = :isVerified', { isVerified: true })
    .andWhere(
      `(6371000 * acos(cos(radians(:lat)) * cos(radians(latitude)) * cos(radians(longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(latitude)))) < 200`,
      { lat, lng },
    )
    .orderBy(
      `(6371000 * acos(cos(radians(:lat)) * cos(radians(latitude)) * cos(radians(longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(latitude))))`,
    )
    .limit(1)
    .getOne();

  return landmarks?.name || null;
}

/**
 * Build street-level instructions
 */
private buildStreetLevelInstructions(
  mainRoadStop: string,
  destination: string,
  streetInfo: { street?: string; area?: string },
  distance: number,
  walkingDirections: any,
  landmark: string | null,
): string {
  const distanceM = Math.round(distance);
  const walkingMin = Math.round(walkingDirections.duration);
  const landmarkText = landmark ? ` after ${landmark}` : '';

  if (distance <= 200) {
    // Very close - just walk
    return `
**Final Step: Walk to ${destination}**

Drop off at ${mainRoadStop}${landmarkText}, then ${destination} is just ${distanceM}m away!

**At ${mainRoadStop}:**
1. Tell driver: "Driver, stop${landmarkText}!"
2. Pay your fare
3. ${destination} is visible from here

**Walking:**
- Distance: ${distanceM}m (about ${walkingMin} minutes)
- Tap "Walk" button for turn-by-turn directions
    `.trim();
  } else if (distance <= 500) {
    // Short walk possible
    return `
**Final Step: Walk to ${destination}**

Drop off at ${mainRoadStop}${landmarkText}, then walk ${distanceM}m to ${destination} (about ${walkingMin} minutes).

**At ${mainRoadStop}:**
1. Tell driver: "Driver, stop${landmarkText}!"
2. Pay your fare
3. Cross to ${streetInfo.street ? `${streetInfo.street}` : 'the side street'}

**Walking Directions:**
${walkingDirections.steps.map((s: any, i: number) => `${i + 1}. ${s.instruction} (${Math.round(s.distance * 1000)}m)`).join('\n')}

**Tip:** Tap "Walk" button for live navigation, or ask locals: "Where ${destination} dey?"
    `.trim();
  } else {
    // Need keke/okada
    return `
**Final Step: Use Keke/Okada to ${destination}**

Drop off at ${mainRoadStop}${landmarkText}, then use local transport to reach ${destination}.

**At ${mainRoadStop}:**
1. Tell driver: "Driver, stop${landmarkText}!"
2. Pay your fare
3. Look for keke or okada riders

**Tell Them:**
"Take me go ${destination}${streetInfo.street ? ` for ${streetInfo.street}` : ''}"

**Fare:** About ₦${Math.min(200, Math.max(100, Math.round(distance / 10)))}
**Distance:** ${distanceM}m (too far to walk comfortably)

**Alternative - Walk:**
If no keke/okada available, you can walk (${walkingMin} minutes):
${walkingDirections.steps.slice(0, 3).map((s: any, i: number) => `${i + 1}. ${s.instruction}`).join('\n')}

Tap "Walk" button for complete directions.
    `.trim();
  }
}

  /**
   * Find nearest location (existing method)
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

  // Geocoding methods (existing)
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    return this.googleMapsService.geocode(address);
  }

  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    return this.googleMapsService.reverseGeocode(lat, lng);
  }

  async findSmartRoutes(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    endLocationName?: string,
  ): Promise<EnhancedRouteResult> {
    return this.findEnhancedRoutes(startLat, startLng, endLat, endLng, endLocationName);
  }
}