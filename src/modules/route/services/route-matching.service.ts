// src/modules/route/services/route-matching.service.ts 
import { Injectable } from '@nestjs/common';
import { GoogleMapsService } from './google-maps.service';
import { IntermediateStopHandlerService } from './intermediate-stop-handler.service';
import { BidirectionalRouteService } from './bidirectional-route.service';
import { LocationFinderService } from './location-finder.service';
import { WalkingRouteService } from './walking-route.service';
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

    // Step 2: Try direct routes (BIDIRECTIONAL)
    if (startLocation && endLocation) {
      const directRoutes = await this.bidirectionalRouteService.findBidirectionalRoutes(
        startLocation.id,
        endLocation.id,
        startLocation.name,
        endLocation.name,
      );

      if (directRoutes.length > 0) {
        result.hasDirectRoute = true;
        result.routes.push(...directRoutes);
        return result; // Have direct routes, return early
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
      // Handle intermediate stop logic (existing code can be moved to intermediate-stop-handler)
      logger.info('Found intermediate stop route');
      // You can expand this section based on your intermediate stop handling needs
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