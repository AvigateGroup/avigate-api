// src/modules/route/services/walking-route.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from '../../location/entities/location.entity';
import { Route } from '../entities/route.entity';
import { GoogleMapsService } from './google-maps.service';
import { GeofencingService } from './geofencing.service';
import { FinalDestinationHandlerService } from './final-destination-handler.service';
import { LocationFinderService } from './location-finder.service';
import { InstructionGeneratorService } from './instruction-generator.service';
import { RouteDataAnalyzerService } from './route-data-analyzer.service';
import { logger } from '@/utils/logger.util';

export interface WalkingRouteResult {
  routeName: string;
  source: 'with_walking';
  distance: number;
  duration: number;
  minFare?: number;
  maxFare?: number;
  steps: any[];
  confidence: number;
  finalDestinationInfo?: any;
}

export interface StreetLevelRouteResult {
  hasDirectRoute: boolean;
  hasIntermediateStop: boolean;
  requiresWalking: boolean;
  routes: any[];
}

@Injectable()
export class WalkingRouteService {
  constructor(
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    private googleMapsService: GoogleMapsService,
    private geofencingService: GeofencingService,
    private finalDestinationHandler: FinalDestinationHandlerService,
    private locationFinderService: LocationFinderService,
    private instructionGeneratorService: InstructionGeneratorService,
    private routeDataAnalyzerService: RouteDataAnalyzerService,
  ) {}

  /**
   * Find route with walking from main road
   */
  async findRouteWithWalking(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    endLocationName: string | undefined,
    startLocation: Location | null,
  ): Promise<WalkingRouteResult | null> {
    const nearbySegments = await this.locationFinderService.findSegmentsNearDestination(
      endLat,
      endLng,
      1.5,
    );

    if (nearbySegments.length === 0) {
      return null;
    }

    let bestRoute: WalkingRouteResult | null = null;
    let shortestWalkingDistance = Infinity;

    for (const segment of nearbySegments) {
      const vehicleDataCheck = this.routeDataAnalyzerService.hasVehicleDataForDestination(
        segment,
        endLat,
        endLng,
      );

      let dropOffPoint: any;
      let walkingDistance: number;

      if (vehicleDataCheck.hasData && vehicleDataCheck.nearestLandmark) {
        dropOffPoint = {
          dropOffLat: vehicleDataCheck.nearestLandmark.lat,
          dropOffLng: vehicleDataCheck.nearestLandmark.lng,
          dropOffName: vehicleDataCheck.nearestLandmark.name,
          landmark: vehicleDataCheck.nearestLandmark.name,
        };
        walkingDistance = vehicleDataCheck.nearestLandmark.distance;
      } else {
        dropOffPoint = await this.finalDestinationHandler.findBestDropOffPoint(
          segment.id,
          endLat,
          endLng,
        );

        if (!dropOffPoint) continue;

        walkingDistance = this.geofencingService.calculateDistance(
          { lat: dropOffPoint.dropOffLat, lng: dropOffPoint.dropOffLng },
          { lat: endLat, lng: endLng },
        );
      }

      if (walkingDistance > 2000) continue;

      if (walkingDistance < shortestWalkingDistance) {
        shortestWalkingDistance = walkingDistance;

        const finalDestInfo = await this.finalDestinationHandler.handleFinalDestination(
          dropOffPoint.dropOffLat,
          dropOffPoint.dropOffLng,
          endLat,
          endLng,
          endLocationName || 'your destination',
          dropOffPoint.landmark || undefined,
        );

        const routeToSegmentStart = startLocation
          ? await this.findRouteToLocation(startLat, startLng, segment.startLocationId)
          : null;

        const endAddress = await this.googleMapsService.reverseGeocode(endLat, endLng);
        const streetInfo = this.instructionGeneratorService.extractStreetInfo(endAddress);

        const enhancedInstructions = vehicleDataCheck.hasData
          ? this.instructionGeneratorService.generateDirectNavigationInstructions(
              dropOffPoint.dropOffName,
              endLocationName || 'your destination',
              streetInfo,
              walkingDistance,
              segment.vehicleService?.vehicleTypes || ['taxi'],
            )
          : this.instructionGeneratorService.generateEnhancedLastMileInstructions(
              dropOffPoint.dropOffName,
              dropOffPoint.landmark || undefined,
              endLocationName || 'your destination',
              streetInfo,
              walkingDistance,
              finalDestInfo.walkingDirections,
            );

        const walkingStep = this.routeDataAnalyzerService.buildEnhancedRouteStep(
          (routeToSegmentStart?.steps.length || 0) + 2,
          dropOffPoint.dropOffName,
          endLocationName || 'Your Destination',
          this.routeDataAnalyzerService.determineTransportMode(
            walkingDistance,
            segment.vehicleService,
          ),
          enhancedInstructions,
          finalDestInfo.walkingDirections?.duration || 0,
          (finalDestInfo.walkingDirections?.distance || 0) / 1000,
          this.routeDataAnalyzerService.calculateFareForStep(
            walkingDistance,
            segment.vehicleService,
          ),
          finalDestInfo.walkingDirections,
          walkingDistance,
        );

        walkingStep.dataAvailability = {
          hasVehicleData: vehicleDataCheck.hasData,
          confidence: vehicleDataCheck.confidence,
          reason: vehicleDataCheck.reason,
        };

        bestRoute = {
          routeName: `${startLocation?.name || 'Your Location'} to ${endLocationName || 'Destination'}`,
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
              instructions: this.instructionGeneratorService.enhanceInstructionsWithDropOff(
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
            walkingStep,
          ],
          confidence: this.routeDataAnalyzerService.calculateRouteConfidence(
            false,
            vehicleDataCheck.hasData,
          ),
          finalDestinationInfo: finalDestInfo,
        };
      }
    }

    return bestRoute;
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
  ): Promise<StreetLevelRouteResult> {
    logger.info('Finding route with street-level guidance', {
      destination: endLocationName,
    });

    // 1. Get address details from Google
    const endAddress = await this.googleMapsService.reverseGeocode(endLat, endLng);
    const streetInfo = this.instructionGeneratorService.extractStreetInfo(endAddress);

    // 2. Find nearest major stop on main road
    const nearestMainRoadStop = await this.locationFinderService.findNearestMainRoadStop(
      endLat,
      endLng,
    );

    if (!nearestMainRoadStop) {
      // Fallback to basic route finding
      return {
        hasDirectRoute: false,
        hasIntermediateStop: false,
        requiresWalking: false,
        routes: [],
      };
    }

    // 3. Calculate distance from main road to destination
    const distanceToDestination = this.geofencingService.calculateDistance(
      { lat: nearestMainRoadStop.lat, lng: nearestMainRoadStop.lng },
      { lat: endLat, lng: endLng },
    );

    // 4. Get walking directions
    const walkingDirections = await this.googleMapsService.getDirections(
      { lat: nearestMainRoadStop.lat, lng: nearestMainRoadStop.lng },
      { lat: endLat, lng: endLng },
      'walking',
    );

    // 5. Find nearest landmark for drop-off guidance
    const dropOffLandmark = await this.locationFinderService.findNearestLandmark(
      nearestMainRoadStop.lat,
      nearestMainRoadStop.lng,
    );

    // 6. Build street-level instructions
    const streetInstructions = this.instructionGeneratorService.buildStreetLevelInstructions(
      nearestMainRoadStop.name,
      endLocationName,
      streetInfo,
      distanceToDestination,
      walkingDirections,
      dropOffLandmark,
    );

    // 7. Build the enhanced step
    const enhancedStep = {
      order: 1,
      fromLocation: nearestMainRoadStop.name,
      toLocation: endLocationName,
      transportMode: distanceToDestination > 500 ? ('keke' as const) : ('walk' as const),
      instructions: streetInstructions,
      duration: distanceToDestination > 500 ? 5 : Math.round(walkingDirections.duration),
      distance: distanceToDestination / 1000,
      estimatedFare: distanceToDestination > 500 ? 200 : 0,
      walkingDirections: walkingDirections,
      alternativeTransport:
        distanceToDestination > 200
          ? {
              type: 'okada' as const,
              estimatedFare: Math.min(
                200,
                Math.max(100, Math.round(distanceToDestination / 10)),
              ),
              instructions: `At ${nearestMainRoadStop.name}, look for okada or keke riders. Tell them: "Take me go ${endLocationName} for ${streetInfo.street}"`,
            }
          : undefined,
    };

    return {
      hasDirectRoute: false,
      hasIntermediateStop: false,
      requiresWalking: distanceToDestination <= 500,
      routes: [
        {
          routeName: `Street-level route to ${endLocationName}`,
          source: 'with_walking',
          distance: distanceToDestination / 1000,
          duration: enhancedStep.duration,
          steps: [enhancedStep],
          confidence: 75,
        },
      ],
    };
  }

  /**
   * Find route to a specific location
   */
  private async findRouteToLocation(
    fromLat: number,
    fromLng: number,
    toLocationId: string,
  ): Promise<any | null> {
    const fromLocation = await this.locationFinderService.findNearestLocation(fromLat, fromLng);
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
}