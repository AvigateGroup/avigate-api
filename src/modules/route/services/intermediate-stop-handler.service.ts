// src/modules/route/services/intermediate-stop-handler.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouteSegment } from '../entities/route-segment.entity';
import { Location } from '../../location/entities/location.entity';
import { GeofencingService } from './geofencing.service';
import { GoogleMapsService } from './google-maps.service';
import { logger } from '@/utils/logger.util';

interface IntermediateStopResult {
  isOnRoute: boolean;
  segment: RouteSegment;
  stopInfo: {
    name: string;
    order: number;
    isOptional: boolean;
    distanceFromStart: number;
    estimatedFare: number;
  };
  instructions: string;
}

@Injectable()
export class IntermediateStopHandlerService {
  constructor(
    @InjectRepository(RouteSegment)
    private segmentRepository: Repository<RouteSegment>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    private geofencingService: GeofencingService,
    private googleMapsService: GoogleMapsService,
  ) {}

  /**
   * Find if destination is an intermediate stop on any segment
   * Example: User searches for "Wimpy" - we find it's on "Rumuokoro → Mile1" segment
   */
  async findSegmentContainingDestination(
    destinationLat: number,
    destinationLng: number,
    destinationName?: string,
  ): Promise<IntermediateStopResult | null> {
    logger.info('Searching for intermediate stop', {
      destinationLat,
      destinationLng,
      destinationName,
    });

    // Get all active segments
    const segments = await this.segmentRepository.find({
      where: { isActive: true },
      relations: ['startLocation', 'endLocation'],
    });

    for (const segment of segments) {
      // Check if destination is within the segment's path
      const isOnSegment = await this.isLocationOnSegment(
        segment,
        destinationLat,
        destinationLng,
        destinationName,
      );

      if (isOnSegment) {
        const stopInfo = await this.getStopDetails(
          segment,
          destinationLat,
          destinationLng,
          destinationName,
        );
        const instructions = this.generateIntermediateStopInstructions(segment, stopInfo);

        return {
          isOnRoute: true,
          segment,
          stopInfo,
          instructions,
        };
      }
    }

    return null;
  }

  /**
   * Check if a location falls on a segment's path
   */
  private async isLocationOnSegment(
    segment: RouteSegment,
    lat: number,
    lng: number,
    locationName?: string,
  ): Promise<boolean> {
    // Method 1: Check if it's in intermediateStops
    if (locationName && segment.intermediateStops && segment.intermediateStops.length > 0) {
      const foundInStops = segment.intermediateStops.some(
        stop =>
          stop.name.toLowerCase().includes(locationName.toLowerCase()) ||
          locationName.toLowerCase().includes(stop.name.toLowerCase()),
      );

      if (foundInStops) {
        logger.info(`Location ${locationName} found in segment intermediate stops`);
        return true;
      }
    }

    // Method 2: Check geographic proximity to segment path
    // Calculate if point is near the line between start and end
    const startLat = Number(segment.startLocation?.latitude);
    const startLng = Number(segment.startLocation?.longitude);
    const endLat = Number(segment.endLocation?.latitude);
    const endLng = Number(segment.endLocation?.longitude);

    // Check if destination is geographically between start and end
    const isGeographicallyBetween = this.isPointNearLine(
      { lat, lng },
      { lat: startLat, lng: startLng },
      { lat: endLat, lng: endLng },
      1.5, // 1.5km tolerance
    );

    if (isGeographicallyBetween) {
      logger.info(`Location is geographically on segment path`);
      return true;
    }

    // Method 3: Use Google Maps to check if it's on the route
    // This is more accurate but uses API calls
    try {
      const waypoints = await this.checkIfPointOnRoute(
        { lat: startLat, lng: startLng },
        { lat: endLat, lng: endLng },
        { lat, lng },
      );

      if (waypoints.isOnRoute) {
        logger.info(`Google Maps confirms location is on route`);
        return true;
      }
    } catch (error) {
      logger.warn('Google Maps route check failed, using geographic method', error);
    }

    return false;
  }

  /**
   * Check if a point is near a line (within tolerance)
   */
  private isPointNearLine(
    point: { lat: number; lng: number },
    lineStart: { lat: number; lng: number },
    lineEnd: { lat: number; lng: number },
    toleranceKm: number,
  ): boolean {
    // Calculate perpendicular distance from point to line
    const distance = this.perpendicularDistance(point, lineStart, lineEnd);

    // Also check if point is between start and end (not beyond)
    const isBetween = this.isPointBetweenEndpoints(point, lineStart, lineEnd);

    return distance <= toleranceKm && isBetween;
  }

  /**
   * Calculate perpendicular distance from point to line
   */
  private perpendicularDistance(
    point: { lat: number; lng: number },
    lineStart: { lat: number; lng: number },
    lineEnd: { lat: number; lng: number },
  ): number {
    // Using Haversine-based approximation for small distances
    const A = point.lat - lineStart.lat;
    const B = point.lng - lineStart.lng;
    const C = lineEnd.lat - lineStart.lat;
    const D = lineEnd.lng - lineStart.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    const param = lenSq !== 0 ? dot / lenSq : -1;

    let nearestLat, nearestLng;

    if (param < 0) {
      nearestLat = lineStart.lat;
      nearestLng = lineStart.lng;
    } else if (param > 1) {
      nearestLat = lineEnd.lat;
      nearestLng = lineEnd.lng;
    } else {
      nearestLat = lineStart.lat + param * C;
      nearestLng = lineStart.lng + param * D;
    }

    return (
      this.geofencingService.calculateDistance(
        { lat: point.lat, lng: point.lng },
        { lat: nearestLat, lng: nearestLng },
      ) / 1000
    ); // Convert to km
  }

  /**
   * Check if point is between line endpoints (not beyond)
   */
  private isPointBetweenEndpoints(
    point: { lat: number; lng: number },
    lineStart: { lat: number; lng: number },
    lineEnd: { lat: number; lng: number },
  ): boolean {
    const distStartToPoint = this.geofencingService.calculateDistance(
      { lat: lineStart.lat, lng: lineStart.lng },
      { lat: point.lat, lng: point.lng },
    );

    const distPointToEnd = this.geofencingService.calculateDistance(
      { lat: point.lat, lng: point.lng },
      { lat: lineEnd.lat, lng: lineEnd.lng },
    );

    const distStartToEnd = this.geofencingService.calculateDistance(
      { lat: lineStart.lat, lng: lineStart.lng },
      { lat: lineEnd.lat, lng: lineEnd.lng },
    );

    // Point is between if sum of distances is approximately equal to total distance
    // Allow 10% tolerance for route curvature
    return distStartToPoint + distPointToEnd <= distStartToEnd * 1.1;
  }

  /**
   * Use Google Maps to verify if point is on route
   */
  private async checkIfPointOnRoute(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    point: { lat: number; lng: number },
  ): Promise<{ isOnRoute: boolean; deviationKm: number }> {
    // Get route without waypoint
    const directRoute = await this.googleMapsService.getDirections(start, end, 'transit');

    // Get route with waypoint
    // Note: You'd need to modify googleMapsService to support waypoints
    // For now, we'll use a simpler approach

    const distanceToStart =
      this.geofencingService.calculateDistance(
        { lat: start.lat, lng: start.lng },
        { lat: point.lat, lng: point.lng },
      ) / 1000;

    const distanceToEnd =
      this.geofencingService.calculateDistance(
        { lat: point.lat, lng: point.lng },
        { lat: end.lat, lng: end.lng },
      ) / 1000;

    const directDistance = directRoute.distance;
    const viaPointDistance = distanceToStart + distanceToEnd;
    const deviation = viaPointDistance - directDistance;

    // If detour is less than 20%, it's likely on the route
    return {
      isOnRoute: deviation < directDistance * 0.2,
      deviationKm: deviation,
    };
  }

  /**
   * Get details about the intermediate stop
   */
  private async getStopDetails(
    segment: RouteSegment,
    lat: number,
    lng: number,
    locationName?: string,
  ): Promise<{
    name: string;
    order: number;
    isOptional: boolean;
    distanceFromStart: number;
    estimatedFare: number;
  }> {
    // Check if it's in intermediate stops
    const foundStop = segment.intermediateStops?.find(
      stop =>
        locationName &&
        (stop.name.toLowerCase().includes(locationName.toLowerCase()) ||
          locationName.toLowerCase().includes(stop.name.toLowerCase())),
    );

    if (foundStop) {
      const distanceFromStart = this.calculatePartialDistance(segment, foundStop.order);

      return {
        name: foundStop.name,
        order: foundStop.order,
        isOptional: foundStop.isOptional,
        distanceFromStart,
        estimatedFare: this.estimatePartialFare(segment, distanceFromStart),
      };
    }

    // If not in intermediate stops, calculate based on geographic position
    const startLat = Number(segment.startLocation?.latitude);
    const startLng = Number(segment.startLocation?.longitude);

    const distanceFromStart =
      this.geofencingService.calculateDistance({ lat: startLat, lng: startLng }, { lat, lng }) /
      1000; // Convert to km

    // Try to get location name from database or Google
    let stopName = locationName || 'Your destination';
    if (!locationName) {
      const address = await this.googleMapsService.reverseGeocode(lat, lng);
      stopName = address || 'Your destination';
    }

    return {
      name: stopName,
      order: this.estimateStopOrder(segment, distanceFromStart),
      isOptional: false,
      distanceFromStart,
      estimatedFare: this.estimatePartialFare(segment, distanceFromStart),
    };
  }

  /**
   * Calculate partial distance for a stop
   */
  private calculatePartialDistance(segment: RouteSegment, stopOrder: number): number {
    const totalDistance = Number(segment.distance);
    const totalStops = segment.intermediateStops?.length || 0;

    // Rough estimate: proportional to stop order
    return totalDistance * (stopOrder / (totalStops + 1));
  }

  /**
   * Estimate stop order based on distance
   */
  private estimateStopOrder(segment: RouteSegment, distanceFromStart: number): number {
    const totalDistance = Number(segment.distance);
    const totalStops = segment.intermediateStops?.length || 0;

    // Estimate which position this stop would be in
    return Math.round((distanceFromStart / totalDistance) * (totalStops + 1));
  }

  /**
   * Estimate fare for partial journey
   */
  private estimatePartialFare(segment: RouteSegment, distanceFromStart: number): number {
    const totalDistance = Number(segment.distance);
    const maxFare = Number(segment.maxFare || 0);

    if (maxFare === 0) return 0;

    // Calculate proportional fare
    const proportion = distanceFromStart / totalDistance;

    // Add minimum fare (usually 40% of max fare as base)
    const minFare = maxFare * 0.4;
    const variableFare = (maxFare - minFare) * proportion;

    return Math.round(minFare + variableFare);
  }

  /**
   * Generate instructions for intermediate stop
   */
  private generateIntermediateStopInstructions(segment: RouteSegment, stopInfo: any): string {
    const startName = segment.startLocation?.name || 'the starting point';
    const endName = segment.endLocation?.name || 'the end point';
    const stopName = stopInfo.name;
    const estimatedFare = stopInfo.estimatedFare;

    return `
**Going to ${stopName} (Intermediate Stop)**

This location is along the ${startName} to ${endName} route.

**At ${startName}:**
- Board any vehicle going to "${endName}"
- Tell the conductor: "I dey drop ${stopName}"
- These buses/taxis pass through your destination

**Important:**
- ${stopName} is between ${startName} and ${endName}
- No need to change vehicles
- Estimated fare: ₦${estimatedFare} (tell conductor before boarding)

**During Journey:**
- Watch for ${stopName} landmark
- Avigate will notify you when approaching
- Tell driver: "Driver, ${stopName}!" when you see it

**Landmarks to Watch For:**
${this.extractNearbyLandmarks(segment, stopInfo.order)}

**Smart Tip:**
Since you're not going all the way to ${endName}, your fare should be less than the full route fare (₦${segment.maxFare}).
    `.trim();
  }

  /**
   * Extract landmarks near the stop
   */
  private extractNearbyLandmarks(segment: RouteSegment, stopOrder: number): string {
    if (!segment.landmarks || segment.landmarks.length === 0) {
      return '- Ask conductor to alert you when approaching';
    }

    // Get landmarks around this stop position
    const totalLandmarks = segment.landmarks.length;
    const landmarkIndex = Math.floor(
      (stopOrder / (segment.intermediateStops?.length || 1)) * totalLandmarks,
    );

    const relevantLandmarks = segment.landmarks.slice(
      Math.max(0, landmarkIndex - 1),
      Math.min(totalLandmarks, landmarkIndex + 2),
    );

    return relevantLandmarks.map(landmark => `- ${landmark}`).join('\n');
  }

  /**
   * Find all segments that go through a specific area
   */
  async findSegmentsPassingThroughArea(
    lat: number,
    lng: number,
    radiusKm: number = 2,
  ): Promise<RouteSegment[]> {
    const segments = await this.segmentRepository.find({
      where: { isActive: true },
      relations: ['startLocation', 'endLocation'],
    });

    const matchingSegments: RouteSegment[] = [];

    for (const segment of segments) {
      const isNearby = await this.isLocationOnSegment(segment, lat, lng);
      if (isNearby) {
        matchingSegments.push(segment);
      }
    }

    return matchingSegments;
  }
}
