// src/modules/route/services/geofencing.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getDistance } from 'geolib';

export interface ProximityAlert {
  type: 'approaching' | 'arrived' | 'off_route' | 'next_step';
  message: string;
  distance: number; // meters
  data?: any;
}

@Injectable()
export class GeofencingService {
  private approachingThreshold: number;
  private arrivalThreshold: number;
  private offRouteThreshold: number;

  constructor(private configService: ConfigService) {
    this.approachingThreshold = this.configService.get<number>('APPROACHING_THRESHOLD', 500);
    this.arrivalThreshold = this.configService.get<number>('ARRIVAL_THRESHOLD', 100);
    this.offRouteThreshold = this.configService.get<number>('OFF_ROUTE_THRESHOLD', 200);
  }

  /**
   * Calculate distance between two coordinates in meters
   */
  calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number },
  ): number {
    return getDistance(
      { latitude: point1.lat, longitude: point1.lng },
      { latitude: point2.lat, longitude: point2.lng },
    );
  }

  /**
   * Check if user is approaching a waypoint
   */
  isApproaching(
    currentLocation: { lat: number; lng: number },
    targetLocation: { lat: number; lng: number },
  ): boolean {
    const distance = this.calculateDistance(currentLocation, targetLocation);
    return distance <= this.approachingThreshold && distance > this.arrivalThreshold;
  }

  /**
   * Check if user has arrived at a waypoint
   */
  hasArrived(
    currentLocation: { lat: number; lng: number },
    targetLocation: { lat: number; lng: number },
  ): boolean {
    const distance = this.calculateDistance(currentLocation, targetLocation);
    return distance <= this.arrivalThreshold;
  }

  /**
   * Check if user is off route
   */
  isOffRoute(
    currentLocation: { lat: number; lng: number },
    routePath: Array<{ lat: number; lng: number }>,
  ): boolean {
    // Find the closest point on the route
    let minDistance = Infinity;

    for (const point of routePath) {
      const distance = this.calculateDistance(currentLocation, point);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    return minDistance > this.offRouteThreshold;
  }

  /**
   * Get proximity alerts based on current location
   */
  getProximityAlerts(
    currentLocation: { lat: number; lng: number },
    targetLocation: { lat: number; lng: number },
    targetName: string,
  ): ProximityAlert[] {
    const alerts: ProximityAlert[] = [];
    const distance = this.calculateDistance(currentLocation, targetLocation);

    if (this.hasArrived(currentLocation, targetLocation)) {
      alerts.push({
        type: 'arrived',
        message: `You have arrived at ${targetName}`,
        distance,
      });
    } else if (this.isApproaching(currentLocation, targetLocation)) {
      alerts.push({
        type: 'approaching',
        message: `Approaching ${targetName} in ${Math.round(distance)} meters`,
        distance,
      });
    }

    return alerts;
  }

  /**
   * Calculate estimated time of arrival based on current speed
   */
  calculateETA(
    currentLocation: { lat: number; lng: number },
    targetLocation: { lat: number; lng: number },
    averageSpeed: number = 30, // km/h default
  ): Date {
    const distanceKm = this.calculateDistance(currentLocation, targetLocation) / 1000;
    const hoursToArrival = distanceKm / averageSpeed;
    const minutesToArrival = hoursToArrival * 60;

    const eta = new Date();
    eta.setMinutes(eta.getMinutes() + minutesToArrival);

    return eta;
  }

  /**
   * Find the nearest point on a route to current location
   */
  findNearestPointOnRoute(
    currentLocation: { lat: number; lng: number },
    routePath: Array<{ lat: number; lng: number }>,
  ): { point: { lat: number; lng: number }; index: number; distance: number } {
    let minDistance = Infinity;
    let nearestPoint = routePath[0];
    let nearestIndex = 0;

    routePath.forEach((point, index) => {
      const distance = this.calculateDistance(currentLocation, point);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = point;
        nearestIndex = index;
      }
    });

    return {
      point: nearestPoint,
      index: nearestIndex,
      distance: minDistance,
    };
  }
}
