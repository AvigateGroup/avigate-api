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

/**
 * UPDATED: Generate last-mile instructions with honest communication
 */
private generateEnhancedLastMileInstructions(
  dropOffPoint: string,
  landmarkBefore: string | undefined,
  destination: string,
  streetInfo: { street?: string; area?: string },
  distanceMeters: number,
  walkingDirections: any,
): string {
  const landmarkText = landmarkBefore ? ` after ${landmarkBefore}` : '';
  const streetText = streetInfo.street ? ` on ${streetInfo.street}` : '';
  const walkingMin = Math.ceil(walkingDirections.duration);

  // CASE 1: Very close (< 200m) - just walk
  if (distanceMeters <= 200) {
    return `
**Final Step: Short Walk to ${destination}**

Drop off at ${dropOffPoint}${landmarkText}, then ${destination} is just ${Math.round(distanceMeters)}m away!

**At ${dropOffPoint}:**
1. Tell driver: "Driver, stop${landmarkText}!"
2. Pay your fare
3. ${destination} is visible from here - you can walk

**Walking:**
- Distance: ${Math.round(distanceMeters)}m (about ${walkingMin} minutes)
- Tap "Walk" button below for turn-by-turn directions
- Or ask locals: "Where ${destination} dey?"
    `.trim();
  }

  // CASE 2: Walkable but check for local transport (200m - 800m)
  if (distanceMeters <= 800) {
    return `
**Final Step: Getting to ${destination}${streetText}**

Drop off at ${dropOffPoint}${landmarkText}. ${destination} is ${Math.round(distanceMeters)}m away (about ${walkingMin} minutes walk).

**At ${dropOffPoint}:**
1. Tell driver: "Driver, stop${landmarkText}!"
2. Pay your fare

**⚠️ Note:** Avigate doesn't have data on vehicles going into ${streetInfo.street || 'this street'}.

**Your Options:**

**Option 1 - Ask Locals (Recommended):**
- Look around for keke, okada, or taxi entering the street
- Ask anyone nearby: "Which motor dey go ${destination}${streetText}?"
- Locals know the area best!

**Option 2 - Walk:**
- ${Math.round(distanceMeters)}m (about ${walkingMin} minutes)
- Tap "Walk" button below for step-by-step directions
- It's not too far!

**Walking Preview:**
${walkingDirections.steps.slice(0, 3).map((s: any, i: number) => `${i + 1}. ${s.instruction}`).join('\n')}

Tap "Walk" for complete turn-by-turn navigation.
    `.trim();
  }

  // CASE 3: Too far to walk comfortably (> 800m)
  const estimatedFare = this.calculateLastMileFare(distanceMeters);
  
  return `
**Final Step: Getting to ${destination}${streetText}**

Drop off at ${dropOffPoint}${landmarkText}. ${destination} is ${Math.round(distanceMeters)}m away.

**At ${dropOffPoint}:**
1. Tell driver: "Driver, stop${landmarkText}!"
2. Pay your fare

**⚠️ Note:** Avigate doesn't have data on vehicles going into ${streetInfo.street || 'this area'}.

**What to Do:**

**1. Look Around:**
- Check for keke or okada entering the street
- Look for other passengers going the same way

**2. Ask for Help:**
- Ask anyone nearby: "Which motor dey go ${destination}${streetText}?"
- Tell keke/okada riders: "You fit carry me go ${destination}?"
- Expected fare: ₦${estimatedFare - 50} - ₦${estimatedFare + 50}

**3. If No Vehicle Available:**
- Tap "Walk" button below
- Avigate will guide you step-by-step (${walkingMin} minutes)
- You can always ask for directions along the way

**Walking Preview:**
${walkingDirections.steps.slice(0, 3).map((s: any, i: number) => `${i + 1}. ${s.instruction}`).join('\n')}

Remember: Locals know shortcuts Avigate doesn't! Don't hesitate to ask for help.
    `.trim();
}

/**
 * NEW: Build enhanced route step with data availability info
 */
private buildEnhancedRouteStep(
  order: number,
  fromLocation: string,
  toLocation: string,
  transportMode: 'bus' | 'taxi' | 'keke' | 'okada' | 'walk',
  instructions: string,
  duration: number,
  distance: number,
  estimatedFare: number | undefined,
  walkingDirections: any,
  distanceMeters: number,
): EnhancedRouteStep {
  // Determine if we have vehicle data for this area
  const hasVehicleData = distanceMeters <= 200; // We only have data for immediate vicinity
  
  const step: EnhancedRouteStep = {
    order,
    fromLocation,
    toLocation,
    transportMode,
    instructions,
    duration,
    distance,
    estimatedFare,
    
    // Data availability
    dataAvailability: {
      hasVehicleData,
      confidence: hasVehicleData ? 'high' : 'low',
      reason: hasVehicleData 
        ? 'Destination is on a major road with known routes'
        : 'Destination is on a side street - local knowledge recommended',
    },
    
    walkingDirections,
  };

  // Add alternative options if no vehicle data
  if (!hasVehicleData) {
    step.alternativeOptions = {
      askLocals: true,
      localPhrases: [
        `Which motor dey go ${toLocation}?`,
        `You fit carry me go ${toLocation}?`,
        `Where ${toLocation} dey?`,
        `How much to ${toLocation}?`,
      ],
      walkable: distanceMeters <= 1500,
    };

    // Add alternative transport if distance is moderate
    if (distanceMeters > 200 && distanceMeters <= 2000) {
      step.alternativeTransport = {
        type: distanceMeters > 800 ? 'keke' : 'okada',
        estimatedFare: this.calculateLastMileFare(distanceMeters),
        instructions: `Look for ${distanceMeters > 800 ? 'keke' : 'okada'} riders at ${fromLocation}. Tell them: "Take me go ${toLocation}"`,
      };
    }
  }

  return step;
}

/**
 * Calculate last mile fare
 */
private calculateLastMileFare(distanceMeters: number): number {
  const baseFare = 100;
  const perMeterRate = 0.10;
  const calculatedFare = baseFare + (distanceMeters * perMeterRate);
  return Math.min(500, Math.max(100, Math.round(calculatedFare / 50) * 50)); // Round to nearest 50
}

/**
 * UPDATED: findRouteWithWalking with data availability
 */
private async findRouteWithWalking(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  endLocationName: string | undefined,
  startLocation: Location | null,
): Promise<any | null> {
  const nearbySegments = await this.findSegmentsNearDestination(endLat, endLng, 1.5);

  if (nearbySegments.length === 0) {
    return null;
  }

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

    if (walkingDistance > 2000) continue;

    if (walkingDistance < shortestWalkingDistance) {
      shortestWalkingDistance = walkingDistance;

      const finalDestInfo = await this.finalDestinationHandler.handleFinalDestination(
        dropOffPoint.dropOffLat,
        dropOffPoint.dropOffLng,
        endLat,
        endLng,
        endLocationName || 'your destination',
        dropOffPoint.landmark,
      );

      const routeToSegmentStart = startLocation
        ? await this.findRouteToLocation(startLat, startLng, segment.startLocationId)
        : null;

      // Get address details
      const endAddress = await this.googleMapsService.reverseGeocode(endLat, endLng);
      const streetInfo = this.extractStreetInfo(endAddress);

      // Build enhanced instructions
      const enhancedInstructions = this.generateEnhancedLastMileInstructions(
        dropOffPoint.dropOffName,
        dropOffPoint.landmarkBefore,
        endLocationName || 'your destination',
        streetInfo,
        walkingDistance,
        finalDestInfo.walkingDirections,
      );

      // Build walking step with data availability
      const walkingStep = this.buildEnhancedRouteStep(
        (routeToSegmentStart?.steps.length || 0) + 2,
        dropOffPoint.dropOffName,
        endLocationName || 'Your Destination',
        'walk',
        enhancedInstructions,
        finalDestInfo.walkingDirections?.duration || 0,
        (finalDestInfo.walkingDirections?.distance || 0) / 1000,
        0,
        finalDestInfo.walkingDirections,
        walkingDistance,
      );

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
          ...(routeToSegmentStart?.steps.map(s => ({
            ...s,
            dataAvailability: {
              hasVehicleData: true,
              confidence: 'high' as const,
              reason: 'Main road segment with known transport routes',
            },
          })) || []),
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
            dataAvailability: {
              hasVehicleData: true,
              confidence: 'high' as const,
              reason: 'Main road segment with known transport routes',
            },
          },
          walkingStep, // Enhanced walking step with data availability
        ],
        confidence: 85,
        finalDestinationInfo: finalDestInfo,
      };
    }
  }

  return bestRoute;
}

// UPDATE buildStreetLevelInstructions to use the enhanced version
private buildStreetLevelInstructions(
  mainRoadStop: string,
  destination: string,
  streetInfo: { street?: string; area?: string },
  distance: number,
  walkingDirections: any,
  landmark: string | null,
): string {
  // Use the enhanced version
  return this.generateEnhancedLastMileInstructions(
    mainRoadStop,
    landmark,
    destination,
    streetInfo,
    distance,
    walkingDirections,
  );
}
}