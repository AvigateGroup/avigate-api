// src/modules/route/services/smart-stop-matching.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouteSegment } from '../entities/route-segment.entity';
import { Location } from '../../location/entities/location.entity';
import { GoogleMapsService } from './google-maps.service';
import { GeofencingService } from './geofencing.service';
import { logger } from '@/utils/logger.util';

interface SegmentStopWithCoordinates {
  name: string;
  order: number;
  isOptional: boolean;
  coordinates: { lat: number; lng: number };
}

interface SmartStopResult {
  useIntermediateStop: boolean;
  closestStop?: {
    name: string;
    locationId?: string;
    coordinates: { lat: number; lng: number };
    distanceFromDestination: number; // meters
  };
  segment?: RouteSegment;
  walkingDirections?: {
    distance: number;
    duration: number;
    steps: Array<{
      instruction: string;
      distance: number;
      duration: number;
    }>;
  };
  instructions: string;
}

@Injectable()
export class SmartStopMatchingService {
  private readonly WALKING_THRESHOLD = 800; // 800 meters (about 10 minutes walk)
  private readonly PROXIMITY_RADIUS = 2; // 2km to search for stops

  constructor(
    @InjectRepository(RouteSegment)
    private segmentRepository: Repository<RouteSegment>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    private googleMapsService: GoogleMapsService,
    private geofencingService: GeofencingService,
  ) {}

  /**
   * Find if destination is near an intermediate stop on any segment
   *
   * Example: User wants "Kala Police Station"
   * - System finds it's 50m from "Wimpy" (intermediate stop)
   * - Returns route to Wimpy + walking directions
   */
  async findNearestIntermediateStop(
    destinationLat: number,
    destinationLng: number,
    destinationName: string,
  ): Promise<SmartStopResult> {
    logger.info('Searching for nearest intermediate stop', {
      destination: destinationName,
      coordinates: { lat: destinationLat, lng: destinationLng },
    });

    // Get all segments with intermediate stops
    const segments = await this.segmentRepository
      .createQueryBuilder('segment')
      .where('segment.isActive = :isActive', { isActive: true })
      .andWhere("segment.intermediateStops != '[]'")
      .getMany();

    let closestStop: SmartStopResult['closestStop'] | null = null;
    let closestSegment: RouteSegment | null = null;
    let minDistance = Infinity;

    // Check each segment's intermediate stops
    for (const segment of segments) {
      if (!segment.intermediateStops || segment.intermediateStops.length === 0) continue;

      for (const stop of segment.intermediateStops) {
        let stopCoordinates: { lat: number; lng: number } | null = null;

        // If stop has locationId, get exact coordinates
        if (stop.locationId) {
          const location = await this.locationRepository.findOne({
            where: { id: stop.locationId },
          });
          if (location) {
            stopCoordinates = {
              lat: Number(location.latitude),
              lng: Number(location.longitude),
            };
          }
        }

        // If no exact coordinates, geocode the stop name
        if (!stopCoordinates) {
          const geocoded = await this.googleMapsService.geocode(`${stop.name}, Nigeria`);
          if (geocoded) {
            stopCoordinates = geocoded;
          }
        }

        if (!stopCoordinates) continue;

        // Calculate distance from destination to this stop
        const distance = this.geofencingService.calculateDistance(
          { lat: destinationLat, lng: destinationLng },
          stopCoordinates,
        );

        logger.debug('Checking stop', {
          stopName: stop.name,
          distance,
          segment: segment.name,
        });

        // Is this the closest stop so far?
        if (distance < minDistance && distance <= this.WALKING_THRESHOLD) {
          minDistance = distance;
          closestStop = {
            name: stop.name,
            locationId: stop.locationId,
            coordinates: stopCoordinates,
            distanceFromDestination: distance,
          };
          closestSegment = segment;
        }
      }
    }

    // No nearby stop found
    if (!closestStop || !closestSegment) {
      return {
        useIntermediateStop: false,
        instructions: `No intermediate stops found near ${destinationName}. Using direct route.`,
      };
    }

    // Get walking directions from stop to final destination
    const walkingDirections = await this.googleMapsService.getDirections(
      closestStop.coordinates,
      { lat: destinationLat, lng: destinationLng },
      'walking',
    );

    // Build instructions
    const instructions = this.buildInstructions(
      closestStop,
      closestSegment,
      destinationName,
      walkingDirections.distance,
      walkingDirections.duration,
    );

    return {
      useIntermediateStop: true,
      closestStop,
      segment: closestSegment,
      walkingDirections: {
        distance: walkingDirections.distance,
        duration: walkingDirections.duration,
        steps: walkingDirections.steps.map(step => ({
          instruction: step.instruction,
          distance: step.distance,
          duration: step.duration,
        })),
      },
      instructions,
    };
  }

  /**
   * Build detailed instructions for using intermediate stop
   */
  private buildInstructions(
    stop: NonNullable<SmartStopResult['closestStop']>,
    segment: RouteSegment,
    finalDestination: string,
    walkingDistance: number,
    walkingDuration: number,
  ): string {
    const walkingDistanceMeters = Math.round(walkingDistance * 1000);
    const walkingMinutes = Math.round(walkingDuration);

    return `
**Smart Route to ${finalDestination}:**

Since ${finalDestination} is not a major bus stop, here's the smart way to get there:

**Step 1: Take Bus/Taxi to ${stop.name}**
- ${segment.name}
- Transport: ${segment.transportModes.join(' or ')}
- Fare: ₦${segment.minFare} - ₦${segment.maxFare}
- Duration: ~${segment.estimatedDuration} minutes

**What to tell the driver/conductor:**
"I dey go ${stop.name}" (I'm going to ${stop.name})

**At ${stop.name}:**
- Avigate will notify you when you arrive
- Tell the driver: "Driver, ${stop.name}!"

**Step 2: Walk to ${finalDestination}**
- Distance: ${walkingDistanceMeters}m (about ${walkingMinutes} minutes walk)
- Avigate will show you turn-by-turn walking directions
- You're very close!

**Why this route?**
${finalDestination} is only ${walkingDistanceMeters}m from ${stop.name}, which is a major stop on the ${segment.name} route. This is faster and cheaper than trying to find direct transport to ${finalDestination}.

**Cost Estimate:**
- Bus/Taxi to ${stop.name}: ₦${segment.minFare} - ₦${segment.maxFare}
- Walking: Free
- **Total: ₦${segment.minFare} - ₦${segment.maxFare}**

**Alternative:**
If you prefer not to walk, you can ask locals at ${stop.name} for okada (motorcycle) or keke to ${finalDestination}. Should cost about ₦100-₦200.
    `.trim();
  }

  /**
   * Enhanced route search that considers intermediate stops
   */
  async findSmartRouteWithStops(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    destinationName: string,
  ) {
    logger.info('Smart route search with intermediate stops', {
      start: { lat: startLat, lng: startLng },
      end: { lat: endLat, lng: endLng },
      destination: destinationName,
    });

    // First, check if destination is near any intermediate stop
    const stopMatch = await this.findNearestIntermediateStop(endLat, endLng, destinationName);

    if (stopMatch.useIntermediateStop && stopMatch.closestStop) {
      logger.info('Found intermediate stop route', {
        stop: stopMatch.closestStop.name,
        walkingDistance: stopMatch.closestStop.distanceFromDestination,
        segment: stopMatch.segment?.name,
      });

      // Now find route from start to the intermediate stop
      const _stopCoordinates = stopMatch.closestStop.coordinates;

      return {
        success: true,
        strategy: 'intermediate_stop',
        data: {
          intermediateStop: stopMatch.closestStop,
          segment: stopMatch.segment,
          walkingDirections: stopMatch.walkingDirections,
          instructions: stopMatch.instructions,
          summary: {
            totalDistance:
              Number(stopMatch.segment?.distance || 0) +
              (stopMatch.walkingDirections?.distance || 0),
            totalDuration:
              Number(stopMatch.segment?.estimatedDuration || 0) +
              (stopMatch.walkingDirections?.duration || 0),
            transportFare: {
              min: Number(stopMatch.segment?.minFare || 0),
              max: Number(stopMatch.segment?.maxFare || 0),
            },
            walkingDistance: stopMatch.walkingDirections?.distance || 0,
            walkingDuration: stopMatch.walkingDirections?.duration || 0,
          },
        },
      };
    }

    // No intermediate stop found, return null so caller can use regular routing
    return {
      success: false,
      strategy: 'none',
      message: 'No suitable intermediate stops found. Use regular routing.',
    };
  }

  /**
   * Get all possible intermediate stops on a segment
   */
  async getSegmentStops(segmentId: string) {
    const segment = await this.segmentRepository.findOne({
      where: { id: segmentId },
    });

    if (!segment || !segment.intermediateStops) {
      return [];
    }

    const stops: SegmentStopWithCoordinates[] = [];

    for (const stop of segment.intermediateStops) {
      let coordinates: { lat: number; lng: number } | null = null;

      if (stop.locationId) {
        const location = await this.locationRepository.findOne({
          where: { id: stop.locationId },
        });
        if (location) {
          coordinates = {
            lat: Number(location.latitude),
            lng: Number(location.longitude),
          };
        }
      }

      if (!coordinates) {
        coordinates = await this.googleMapsService.geocode(`${stop.name}, Nigeria`);
      }

      if (coordinates) {
        stops.push({
          name: stop.name,
          order: stop.order,
          isOptional: stop.isOptional,
          coordinates,
        });
      }
    }

    return stops;
  }
}
