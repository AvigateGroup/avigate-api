// src/modules/route/services/route-matching.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from '../../location/entities/location.entity';
import { Route } from '../entities/route.entity';
import { GoogleMapsService } from './google-maps.service';
import { GeofencingService } from './geofencing.service';
import { logger } from '@/utils/logger.util';

export interface SmartRouteResult {
  hasDirectRoute: boolean;
  routes: Array<{
    routeId?: string;
    routeName: string;
    source: 'database' | 'google_maps' | 'hybrid';
    distance: number;
    duration: number;
    minFare?: number;
    maxFare?: number;
    steps: any[];
    confidence: number; // 0-100
  }>;
}

@Injectable()
export class RouteMatchingService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    private googleMapsService: GoogleMapsService,
    private geofencingService: GeofencingService,
  ) {}

  /**
   * Find nearest location to coordinates
   */
  async findNearestLocation(lat: number, lng: number, radiusKm: number = 2): Promise<Location | null> {
    // Simple bounding box search (you can optimize with PostGIS later)
    const latDelta = radiusKm / 111; // rough approximation
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

    // Find closest
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
   * Smart route finding - combines database and Google Maps
   */
  async findSmartRoutes(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
  ): Promise<SmartRouteResult> {
    logger.info(`Finding smart routes from (${startLat}, ${startLng}) to (${endLat}, ${endLng})`);

    const result: SmartRouteResult = {
      hasDirectRoute: false,
      routes: [],
    };

    // Step 1: Find nearest locations to start and end points
    const startLocation = await this.findNearestLocation(startLat, startLng);
    const endLocation = await this.findNearestLocation(endLat, endLng);

    logger.info(`Nearest start location: ${startLocation?.name || 'none'}`);
    logger.info(`Nearest end location: ${endLocation?.name || 'none'}`);

    // Step 2: Check if we have a direct route in database
    if (startLocation && endLocation) {
      const dbRoutes = await this.routeRepository.find({
        where: {
          startLocationId: startLocation.id,
          endLocationId: endLocation.id,
          isActive: true,
        },
        relations: ['steps', 'steps.fromLocation', 'steps.toLocation', 'startLocation', 'endLocation'],
        order: { popularityScore: 'DESC' },
        take: 3,
      });

      if (dbRoutes.length > 0) {
        result.hasDirectRoute = true;

        for (const route of dbRoutes) {
          route.steps.sort((a, b) => a.stepOrder - b.stepOrder);

          result.routes.push({
            routeId: route.id,
            routeName: route.name,
            source: 'database',
            distance: Number(route.distance),
            duration: Number(route.estimatedDuration),
            minFare: route.minFare ? Number(route.minFare) : undefined,
            maxFare: route.maxFare ? Number(route.maxFare) : undefined,
            steps: route.steps,
            confidence: 95, // High confidence for verified routes
          });
        }
      }
    }

    // Step 3: Get Google Maps route as backup or primary
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
        confidence: result.hasDirectRoute ? 70 : 85, // Lower if we have local routes
      });
    } catch (error) {
      logger.error('Failed to get Google Maps route:', error);
    }

    // Step 4: Sort by confidence and duration
    result.routes.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return a.duration - b.duration;
    });

    return result;
  }

  /**
   * Geocode address to coordinates
   */
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    return this.googleMapsService.geocode(address);
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    return this.googleMapsService.reverseGeocode(lat, lng);
  }
}