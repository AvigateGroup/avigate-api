// src/modules/route/services/route-data-analyzer.service.ts
import { Injectable } from '@nestjs/common';
import { RouteSegment, VehicleServiceInfo } from '../entities/route-segment.entity';
import { GeofencingService } from './geofencing.service';
import { LocationFinderService } from './location-finder.service';

export interface EnhancedRouteStep {
  order: number;
  fromLocation: string;
  toLocation: string;
  transportMode: 'bus' | 'taxi' | 'keke' | 'okada' | 'walk';
  instructions: string;
  duration: number;
  distance: number;
  estimatedFare?: number;
  dataAvailability?: {
    hasVehicleData: boolean;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  };
  walkingDirections?: any;
  alternativeOptions?: {
    askLocals: boolean;
    localPhrases: string[];
    walkable: boolean;
  };
  alternativeTransport?: {
    type: 'keke' | 'okada';
    estimatedFare: number;
    instructions: string;
  };
}

export interface VehicleDataCheckResult {
  hasData: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  nearestLandmark?: { name: string; lat: number; lng: number; distance: number };
}

@Injectable()
export class RouteDataAnalyzerService {
  constructor(
    private geofencingService: GeofencingService,
    private locationFinderService: LocationFinderService,
  ) {}

  /**
   * Check if segment has vehicle data for destination
   */
  hasVehicleDataForDestination(
    segment: RouteSegment,
    endLat: number,
    endLng: number,
  ): VehicleDataCheckResult {
    if (segment.vehicleService) {
      if (segment.vehicleService.serviceType === 'main_road') {
        return {
          hasData: true,
          confidence: 'high',
          reason: 'Main road with regular vehicle service',
        };
      }

      if (
        (segment.vehicleService.serviceType === 'side_street' ||
          segment.vehicleService.serviceType === 'residential') &&
        segment.vehicleService.hasRegularService
      ) {
        const nearestLandmark = this.locationFinderService.findNearestLandmarkOnSegmentSync(
          segment,
          endLat,
          endLng,
        );

        if (nearestLandmark && nearestLandmark.distance <= 200) {
          return {
            hasData: true,
            confidence: 'high',
            reason: `${segment.vehicleService.vehicleTypes.join('/')} service available on this street`,
            nearestLandmark,
          };
        }

        return {
          hasData: true,
          confidence: 'medium',
          reason: `${segment.vehicleService.vehicleTypes.join('/')} available but may need to ask locals`,
        };
      }
    }

    const nearestLandmark = this.locationFinderService.findNearestLandmarkOnSegmentSync(
      segment,
      endLat,
      endLng,
    );

    if (nearestLandmark) {
      if (nearestLandmark.distance <= 200) {
        return {
          hasData: true,
          confidence: 'high',
          reason: 'Destination is on main road near known landmark',
          nearestLandmark,
        };
      }

      if (nearestLandmark.distance <= 500) {
        return {
          hasData: true,
          confidence: 'medium',
          reason: 'Close to known landmark - driver can find it',
          nearestLandmark,
        };
      }
    }

    return {
      hasData: false,
      confidence: 'low',
      reason: 'Side street - local knowledge recommended',
    };
  }

  /**
   * Build enhanced route step with data availability info
   */
  buildEnhancedRouteStep(
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
    const hasVehicleData = distanceMeters <= 200;

    const step: EnhancedRouteStep = {
      order,
      fromLocation,
      toLocation,
      transportMode,
      instructions,
      duration,
      distance,
      estimatedFare,

      dataAvailability: {
        hasVehicleData,
        confidence: hasVehicleData ? 'high' : 'low',
        reason: hasVehicleData
          ? 'Destination is on a major road with known routes'
          : 'Destination is on a side street - local knowledge recommended',
      },

      walkingDirections,
    };

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
   * Determine appropriate transport mode based on distance and vehicle service
   */
  determineTransportMode(
    distanceMeters: number,
    vehicleService?: VehicleServiceInfo,
  ): 'bus' | 'taxi' | 'keke' | 'okada' | 'walk' {
    if (distanceMeters <= 200) return 'walk';

    if (vehicleService?.hasRegularService) {
      if (vehicleService.vehicleTypes.includes('keke')) return 'keke';
      if (vehicleService.vehicleTypes.includes('okada')) return 'okada';
      if (vehicleService.vehicleTypes.includes('taxi')) return 'taxi';
    }

    if (distanceMeters <= 500) return 'walk';
    if (distanceMeters <= 1500) return 'okada';
    return 'keke';
  }

  /**
   * Calculate fare based on vehicle service availability
   */
  calculateFareForStep(distanceMeters: number, vehicleService?: VehicleServiceInfo): number {
    if (distanceMeters <= 200) return 0;

    if (vehicleService?.hasRegularService) {
      if (vehicleService.vehicleTypes.includes('keke')) {
        return Math.min(300, Math.max(100, Math.round(distanceMeters / 10)));
      }
      if (vehicleService.vehicleTypes.includes('okada')) {
        return Math.min(250, Math.max(100, Math.round(distanceMeters / 12)));
      }
    }

    return this.calculateLastMileFare(distanceMeters);
  }

  /**
   * Calculate last mile fare
   */
  calculateLastMileFare(distanceMeters: number): number {
    const baseFare = 100;
    const perMeterRate = 0.1;
    const calculatedFare = baseFare + distanceMeters * perMeterRate;
    return Math.min(500, Math.max(100, Math.round(calculatedFare / 50) * 50));
  }

  /**
   * Calculate route confidence score
   */
  calculateRouteConfidence(hasDirectRoute: boolean, hasVehicleData: boolean): number {
    if (hasDirectRoute) return 95;
    if (hasVehicleData) return 90;
    return 75;
  }
}