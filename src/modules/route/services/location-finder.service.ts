// src/modules/route/services/location-finder.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from '../../location/entities/location.entity';
import { Landmark } from '../../location/entities/landmark.entity';
import { RouteSegment } from '../entities/route-segment.entity';
import { GeofencingService } from './geofencing.service';

export interface NearestMainRoadStop {
  name: string;
  lat: number;
  lng: number;
  locationId: string;
}

export interface NearestLandmarkResult {
  name: string;
  lat: number;
  lng: number;
  distance: number;
}

@Injectable()
export class LocationFinderService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    @InjectRepository(Landmark)
    private landmarkRepository: Repository<Landmark>,
    @InjectRepository(RouteSegment)
    private segmentRepository: Repository<RouteSegment>,
    private geofencingService: GeofencingService,
  ) {}

  /**
   * Find nearest location to given coordinates
   */
  async findNearestLocation(
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

  /**
   * Find nearest major stop on main road
   */
  async findNearestMainRoadStop(
    lat: number,
    lng: number,
  ): Promise<NearestMainRoadStop | null> {
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

    let nearest: (typeof majorStops)[0] | null = null;
    let minDistance = Infinity;

    for (const stop of majorStops) {
      const distance = this.geofencingService.calculateDistance(
        { lat, lng },
        { lat: Number(stop.latitude), lng: Number(stop.longitude) },
      );

      if (distance < minDistance && distance < 2000) {
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
  async findNearestLandmark(lat: number, lng: number): Promise<string | null> {
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
   * Find nearest landmark on a specific segment
   */
  async findNearestLandmarkOnSegment(
    segment: RouteSegment,
    endLat: number,
    endLng: number,
  ): Promise<NearestLandmarkResult | null> {
    if (!segment.landmarks || segment.landmarks.length === 0) {
      return null;
    }

    let nearest: NearestLandmarkResult | null = null;
    let minDistance = Infinity;

    for (const landmark of segment.landmarks) {
      const distance = this.geofencingService.calculateDistance(
        { lat: endLat, lng: endLng },
        { lat: landmark.lat, lng: landmark.lng },
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = {
          name: landmark.name,
          lat: landmark.lat,
          lng: landmark.lng,
          distance,
        };
      }
    }

    return nearest;
  }

  /**
   * Find nearest landmark on a specific segment (synchronous version)
   */
  findNearestLandmarkOnSegmentSync(
    segment: RouteSegment,
    endLat: number,
    endLng: number,
  ): NearestLandmarkResult | null {
    if (!segment.landmarks || segment.landmarks.length === 0) {
      return null;
    }

    let nearest: NearestLandmarkResult | null = null;
    let minDistance = Infinity;

    for (const landmark of segment.landmarks) {
      const distance = this.geofencingService.calculateDistance(
        { lat: endLat, lng: endLng },
        { lat: landmark.lat, lng: landmark.lng },
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = {
          name: landmark.name,
          lat: landmark.lat,
          lng: landmark.lng,
          distance,
        };
      }
    }

    return nearest;
  }

  /**
   * Find segments that pass near a destination
   */
  async findSegmentsNearDestination(
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
    const distanceToStart = this.geofencingService.calculateDistance(point, lineStart) / 1000;
    const distanceToEnd = this.geofencingService.calculateDistance(point, lineEnd) / 1000;
    const lineLength = this.geofencingService.calculateDistance(lineStart, lineEnd) / 1000;

    return (
      distanceToStart + distanceToEnd <= lineLength * 1.2 &&
      Math.min(distanceToStart, distanceToEnd) <= toleranceKm
    );
  }
}