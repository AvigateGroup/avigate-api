// src/modules/route/services/route-matching.service.ts 
import { Injectable } from '@nestjs/common';
import { GoogleMapsService } from './google-maps.service';
import { IntermediateStopHandlerService } from './intermediate-stop-handler.service';
import { BidirectionalRouteService } from './bidirectional-route.service';
import { LocationFinderService } from './location-finder.service';
import { WalkingRouteService } from './walking-route.service';
import { logger } from '@/utils/logger.util';
import { roundToNearest50, floorToNearest50, ceilToNearest50 } from '@/utils/fare.util';

export interface EnhancedRouteResult {
  hasDirectRoute: boolean;
  hasIntermediateStop: boolean;
  requiresWalking: boolean;
  routes: Array<{
    id?: string; // Frontend expects 'id'
    routeName: string;
    source: 'database' | 'google_maps' | 'intermediate_stop' | 'with_walking';
    distance: number; // in meters
    duration: number; // in seconds
    minFare?: number;
    maxFare?: number;
    steps: any[];
    confidence: number;
    isReversed?: boolean;
    intermediateStopInfo?: any;
    finalDestinationInfo?: {
      needsWalking: boolean;
      dropOffLocation: any;
      walkingDirections?: any;
      alternativeTransport?: any;
    };
  }>;
}

/**
 * Helper to extract clean transport mode from potentially malformed data
 */
function cleanTransportMode(mode: any): 'bus' | 'taxi' | 'keke' | 'okada' | 'walk' {
  if (!mode) return 'bus';

  let cleanMode = mode;

  // Handle object types
  if (typeof mode === 'object' && mode !== null) {
    cleanMode = mode.type || mode.mode || Object.values(mode)[0] || 'bus';
  }

  // Handle string types (may have JSON artifacts)
  if (typeof cleanMode === 'string') {
    cleanMode = cleanMode
      .replace(/^\{?"?/g, '')  // Remove leading { or {"
      .replace(/"?\}?$/g, '')  // Remove trailing "} or }
      .replace(/^["'\[]*/g, '') // Remove leading quotes/brackets
      .replace(/["'\]]*$/g, '') // Remove trailing quotes/brackets
      .trim()
      .toLowerCase();
  }

  // Map to valid transport modes
  const validModes = ['bus', 'taxi', 'keke', 'okada', 'walk'];
  if (validModes.includes(cleanMode)) {
    return cleanMode as 'bus' | 'taxi' | 'keke' | 'okada' | 'walk';
  }

  // Handle common variations
  if (cleanMode === 'walking') return 'walk';
  if (cleanMode === 'car') return 'taxi';
  if (cleanMode === 'tricycle') return 'keke';
  if (cleanMode === 'motorcycle' || cleanMode === 'bike') return 'okada';

  return 'bus'; // Default fallback
}

@Injectable()
export class RouteMatchingService {
  constructor(
    private googleMapsService: GoogleMapsService,
    private intermediateStopHandler: IntermediateStopHandlerService,
    private bidirectionalRouteService: BidirectionalRouteService,
    private locationFinderService: LocationFinderService,
    private walkingRouteService: WalkingRouteService,
  ) {}

  /**
   * ENHANCED route finding with:
   * 1. Direct routes (forward AND reverse) 
   * 2. Intermediate stops
   * 3. Walking from main roads
   */
  async findEnhancedRoutes(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    endLocationName?: string,
  ): Promise<EnhancedRouteResult> {
    logger.info('Finding enhanced routes with bidirectional support', {
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
    const startLocation = await this.locationFinderService.findNearestLocation(startLat, startLng);
    const endLocation = await this.locationFinderService.findNearestLocation(
      endLat,
      endLng,
      0.5,
    );

    // Step 1.5: FIRST check if user is ON a segment path (mid-segment boarding)
    // This prevents routing users backwards when they're already on the highway
    // Example: User on Rumuji-Mpakirche Rd should board there, not walk back to Choba Junction
    const bestBoardingPoint = await this.locationFinderService.findBestBoardingPoint(
      startLat,
      startLng,
      endLat,
      endLng,
      endLocationName,
    );

    // If user is on a segment going the right direction AND not already at a junction
    const userIsOnSegmentPath = bestBoardingPoint?.isCorrectDirection &&
      bestBoardingPoint.distanceFromUser < 2000; // Within 2km of main road

    // User is "at a junction" only if they're very close (within 300m) to a known stop
    const distToNearestLocation = startLocation
      ? this.haversineDistance(startLat, startLng, Number(startLocation.latitude), Number(startLocation.longitude))
      : Infinity;
    const userIsAtJunction = distToNearestLocation < 300;

    logger.info('Route decision check', {
      userIsOnSegmentPath,
      userIsAtJunction,
      distToNearestLocation,
      bestBoardingPoint: bestBoardingPoint ? {
        name: bestBoardingPoint.name,
        isCorrectDirection: bestBoardingPoint.isCorrectDirection,
        distanceFromUser: bestBoardingPoint.distanceFromUser,
      } : null,
    });

    // Step 2: If user is on a segment path (not at a junction), use mid-segment boarding
    if (userIsOnSegmentPath && !userIsAtJunction) {
      logger.info('User is on segment path - using mid-segment boarding', {
        boardingPoint: bestBoardingPoint.name,
        segment: bestBoardingPoint.segment.name,
        distanceToRoad: bestBoardingPoint.distanceFromUser,
      });
      // Continue to the boarding point logic below (Step 2.5)
    }
    // Step 2a: If user IS at a junction, try direct routes
    else if (startLocation && endLocation) {
      const directRoutes = await this.bidirectionalRouteService.findBidirectionalRoutes(
        startLocation.id,
        endLocation.id,
        startLocation.name,
        endLocation.name,
      );

      if (directRoutes.length > 0) {
        result.hasDirectRoute = true;
        result.routes.push(...directRoutes);
        await this.addWalkingStepIfNeeded(startLat, startLng, result.routes);
        return result;
      }
    }

    // Step 2.5: Use mid-segment boarding if user is on segment path
    if (userIsOnSegmentPath && !userIsAtJunction && bestBoardingPoint) {
      logger.info('Using mid-segment boarding - user is on highway', {
        boardingPoint: bestBoardingPoint.name,
        segment: bestBoardingPoint.segment.name,
        distance: bestBoardingPoint.distanceFromUser,
      });

      const segment = bestBoardingPoint.segment;

      // Calculate walking distance to boarding point
      const walkingDistanceMeters = bestBoardingPoint.distanceFromUser;
      const walkingDurationSeconds = Math.round(walkingDistanceMeters / 1.4); // ~1.4 m/s walking speed

      // Calculate segment distance and duration
      const segmentDistanceMeters = Number(segment.distance || 0) * 1000;
      const segmentDurationSeconds = Number(segment.estimatedDuration || 0) * 60;

      // Round fares to nearest 50 naira
      const roundedMinFare = floorToNearest50(Number(segment.minFare || 0));
      const roundedMaxFare = ceilToNearest50(Number(segment.maxFare || 0));

      const steps: any[] = [];

      const destName = endLocationName || segment.endLocation?.name || 'Destination';
      const transportTypes = (segment.transportModes || ['taxi']).join(' or ');

      // Add walking step if needed (>100m from boarding point)
      if (walkingDistanceMeters > 100) {
        steps.push({
          order: 1,
          transportMode: 'walk',
          transportModes: ['walk'],
          fromLocation: 'Your Location',
          toLocation: bestBoardingPoint.name,
          instructions: `Walk to the main road (${Math.round(walkingDistanceMeters)}m). You can wave down any ${transportTypes} going to ${destName} from here.`,
          distance: Math.round(walkingDistanceMeters),
          duration: walkingDurationSeconds,
        });
      }

      // Add vehicle step
      steps.push({
        order: steps.length + 1,
        transportMode: cleanTransportMode(segment.transportModes?.[0]),
        transportModes: (segment.transportModes || []).map(cleanTransportMode),
        fromLocation: bestBoardingPoint.name,
        toLocation: destName,
        instructions: `Wave down a ${transportTypes} going to ${destName}. Tell the driver: "I dey go ${destName}". The vehicle will take you directly there.`,
        distance: segmentDistanceMeters,
        duration: segmentDurationSeconds,
        estimatedFare: roundedMaxFare,
      });

      result.routes.push({
        id: segment.id,
        routeName: `Direct to ${endLocationName || segment.endLocation?.name}`,
        source: 'database',
        distance: Math.round(walkingDistanceMeters) + segmentDistanceMeters,
        duration: walkingDurationSeconds + segmentDurationSeconds,
        minFare: roundedMinFare,
        maxFare: roundedMaxFare,
        steps,
        confidence: 90,
      });

      if (result.routes.length > 0) {
        result.hasDirectRoute = true;
        return result;
      }
    }

    // Step 3: Check intermediate stops
    const intermediateResult =
      await this.intermediateStopHandler.findSegmentContainingDestination(
        endLat,
        endLng,
        endLocationName,
      );

    if (intermediateResult?.isOnRoute) {
      result.hasIntermediateStop = true;
      logger.info('Found intermediate stop route');

      // Add the intermediate stop route to results
      const segment = intermediateResult.segment;
      const stopInfo = intermediateResult.stopInfo;

      // Calculate distance and duration
      const distanceKm = stopInfo.distanceFromStart || Number(segment.distance || 0);
      const totalDurationMin = Number(segment.estimatedDuration || 0);
      const segmentDistanceKm = Number(segment.distance || 0);

      // Estimate duration proportionally if we have total duration
      let durationMin = 0;
      if (totalDurationMin > 0 && segmentDistanceKm > 0 && distanceKm > 0) {
        durationMin = (distanceKm / segmentDistanceKm) * totalDurationMin;
      }

      // Convert to units expected by frontend: meters and seconds
      const distanceMeters = distanceKm * 1000;
      const durationSeconds = durationMin * 60;

      // Round fares to nearest 50 naira (Nigerian standard)
      const roundedMinFare = floorToNearest50(Number(segment.minFare || 0));
      const roundedMaxFare = ceilToNearest50(stopInfo.estimatedFare);
      const roundedEstimatedFare = roundToNearest50(stopInfo.estimatedFare);

      result.routes.push({
        id: segment.id, // Frontend expects 'id', not 'routeId'
        routeName: `${segment.startLocation?.name} to ${segment.endLocation?.name} (via ${stopInfo.name})`,
        source: 'intermediate_stop',
        distance: distanceMeters, // Frontend expects meters
        duration: durationSeconds, // Frontend expects seconds
        minFare: roundedMinFare,
        maxFare: roundedMaxFare,
        steps: [
          {
            order: 1,
            transportMode: cleanTransportMode(segment.transportModes?.[0]),
            transportModes: (segment.transportModes || []).map(cleanTransportMode), // All available modes
            fromLocation: segment.startLocation?.name || 'Start',
            toLocation: stopInfo.name,
            instructions: intermediateResult.instructions,
            distance: distanceMeters,
            duration: durationSeconds,
            estimatedFare: roundedEstimatedFare,
          },
        ],
        confidence: 85,
        intermediateStopInfo: {
          stopName: stopInfo.name,
          order: stopInfo.order,
          isOptional: stopInfo.isOptional,
          distanceFromStart: stopInfo.distanceFromStart,
          estimatedFare: roundedEstimatedFare,
        },
      });

      logger.info(
        `Intermediate stop route added: ${distanceKm}km, ${durationMin}min, fare: ₦${stopInfo.estimatedFare}`,
      );
      await this.addWalkingStepIfNeeded(startLat, startLng, result.routes);
      return result;
    }

    // Step 4: Check if destination requires walking from main road
    if (!result.hasDirectRoute && !result.hasIntermediateStop) {
      logger.info('No direct/intermediate routes found, checking if walking needed');

      const walkingRoute = await this.walkingRouteService.findRouteWithWalking(
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

    // Step 4b: Prepend walking step if user is far from route start
    if (result.routes.length > 0) {
      await this.addWalkingStepIfNeeded(startLat, startLng, result.routes);
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
          distance: googleRoute.distance * 1000, // Convert km to meters
          duration: googleRoute.duration * 60, // Convert minutes to seconds
          steps: googleRoute.steps.map((step, index) => ({
            order: index + 1,
            instructions: step.instruction,
            distance: step.distance * 1000, // Convert km to meters
            duration: step.duration * 60, // Convert minutes to seconds
          })),
          confidence: 70,
        });
      } catch (error) {
        const errorMessage = error?.message || String(error);
        // Only log as warning for expected errors
        if (
          errorMessage.includes('ZERO_RESULTS') ||
          errorMessage.includes('SAME_LOCATION') ||
          errorMessage.includes('Invalid coordinates')
        ) {
          logger.warn(
            `Google Maps fallback not available: ${errorMessage.split(':')[1]?.trim() || errorMessage}`,
          );
        } else {
          logger.error('Google Maps fallback failed:', error);
        }
      }
    }

    return result;
  }

  /**
   * Handle street-level destinations
   */
  async findRouteWithStreetLevelGuidance(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    endLocationName: string,
  ): Promise<EnhancedRouteResult> {
    return this.walkingRouteService.findRouteWithStreetLevelGuidance(
      startLat,
      startLng,
      endLat,
      endLng,
      endLocationName,
    );
  }

  /**
   * Geocoding delegates
   */
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    return this.googleMapsService.geocode(address);
  }

  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    return this.googleMapsService.reverseGeocode(lat, lng);
  }

  /**
   * Prepend a walking step if the user is >200m from the route's first fromLocation.
   * Uses corridor-aware projection (via segment landmarks) to find the nearest point
   * on the actual road, instead of always walking to named junctions.
   */
  private async addWalkingStepIfNeeded(
    userLat: number,
    userLng: number,
    routes: EnhancedRouteResult['routes'],
  ): Promise<void> {
    for (const route of routes) {
      const firstStep = route.steps?.[0];
      if (!firstStep?.fromLocation) continue;

      // Skip if the first step is already a walking step (mid-segment boarding handled it)
      if (firstStep.transportMode === 'walk') continue;

      // Try corridor-aware projection first using the route's segment
      let boardingName: string | null = null;
      let boardingDist = Infinity;

      if (route.id) {
        const corridorPoint = await this.locationFinderService.findCorridorBoardingPoint(
          userLat,
          userLng,
          route.id,
        );

        if (corridorPoint && corridorPoint.distance < 2000) {
          boardingName = corridorPoint.name;
          boardingDist = corridorPoint.distance;
        }
      }

      // Fall back to nearest junction if corridor projection didn't work
      if (!boardingName) {
        const junctionStop = await this.locationFinderService.findNearestMainRoadStop(userLat, userLng);
        if (junctionStop) {
          boardingDist = this.haversineDistance(userLat, userLng, junctionStop.lat, junctionStop.lng);
          boardingName = junctionStop.name;
        }
      }

      if (!boardingName) continue;

      // Only add walking step if user is >200m but <2km from the boarding point
      if (boardingDist > 200 && boardingDist < 2000) {
        const walkingDuration = Math.round(boardingDist / 1.4); // ~1.4 m/s walking speed, in seconds

        const walkingStep = {
          order: 0,
          transportMode: 'walk',
          fromLocation: 'Your Location',
          toLocation: boardingName,
          instructions: `Walk to ${boardingName} (${Math.round(boardingDist)}m). Board any vehicle heading to your destination from here.`,
          distance: Math.round(boardingDist),
          duration: walkingDuration,
        };

        // Prepend walking step and re-number
        route.steps.unshift(walkingStep);
        route.steps.forEach((step, i) => { step.order = i + 1; });

        // Update total distance/duration
        route.distance += Math.round(boardingDist);
        route.duration += walkingDuration;

        logger.info(`Prepended walking step: ${Math.round(boardingDist)}m to ${boardingName}`);
      }
    }
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Alias for enhanced routes
   */
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