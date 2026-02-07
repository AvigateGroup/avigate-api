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

export interface DirectionalBoardingPoint {
  name: string;
  lat: number;
  lng: number;
  locationId?: string;
  segment: RouteSegment;
  distanceFromUser: number;
  isCorrectDirection: boolean; // true if boarding here goes toward destination
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

  /**
   * Find best boarding point considering direction of travel
   * This finds segments that pass near the user AND go toward the destination
   */
  async findBestBoardingPoint(
    userLat: number,
    userLng: number,
    destLat: number,
    destLng: number,
    destName?: string,
  ): Promise<DirectionalBoardingPoint | null> {
    // Find all segments within 2km of user
    const segments = await this.segmentRepository.find({
      where: { isActive: true },
      relations: ['startLocation', 'endLocation'],
    });

    const candidates: DirectionalBoardingPoint[] = [];

    for (const segment of segments) {
      const segStartLat = Number(segment.startLocation?.latitude);
      const segStartLng = Number(segment.startLocation?.longitude);
      const segEndLat = Number(segment.endLocation?.latitude);
      const segEndLng = Number(segment.endLocation?.longitude);

      if (isNaN(segStartLat) || isNaN(segEndLat)) continue;

      // Check if user is near this segment's path
      const distToSegStart = this.geofencingService.calculateDistance(
        { lat: userLat, lng: userLng },
        { lat: segStartLat, lng: segStartLng },
      );
      const distToSegEnd = this.geofencingService.calculateDistance(
        { lat: userLat, lng: userLng },
        { lat: segEndLat, lng: segEndLng },
      );

      // User should be within reasonable distance of the segment
      // Use a more lenient check: within 3km of either endpoint OR within 2km of the line
      const nearSegment = distToSegStart < 3000 || distToSegEnd < 3000 ||
        this.isPointNearLine(
          { lat: userLat, lng: userLng },
          { lat: segStartLat, lng: segStartLng },
          { lat: segEndLat, lng: segEndLng },
          2.0, // 2km tolerance for curved roads
        );

      if (!nearSegment) continue;

      // Check if destination is near segment END (forward direction)
      // or near segment START (reverse direction)
      const destToSegEnd = this.geofencingService.calculateDistance(
        { lat: destLat, lng: destLng },
        { lat: segEndLat, lng: segEndLng },
      );
      const destToSegStart = this.geofencingService.calculateDistance(
        { lat: destLat, lng: destLng },
        { lat: segStartLat, lng: segStartLng },
      );

      // Check if destination is on this segment's path or at its end
      const destNearSegEnd = destToSegEnd < 2000;
      const destNearSegStart = destToSegStart < 2000;
      const destOnSegment = destName && segment.intermediateStops?.some(
        stop => stop.name.toLowerCase().includes(destName.toLowerCase()) ||
          destName.toLowerCase().includes(stop.name.toLowerCase())
      );

      // Determine if this is the correct direction
      // Key insight: User should travel TOWARD the destination, not away from it
      //
      // For FORWARD travel (start → end):
      //   - Destination should be at/near segment end OR between user and end
      //   - User should NOT already be past the destination
      //
      // For REVERSE travel (end → start):
      //   - Destination should be at/near segment start OR between user and start
      //   - User should NOT already be past the destination

      // User's position along segment (0 = at start, 1 = at end)
      const userPositionRatio = distToSegStart / (distToSegStart + distToSegEnd);

      // Destination's position along segment
      const destPositionRatio = destToSegStart / (destToSegStart + destToSegEnd);

      // Forward is correct if: destination is ahead of user (toward end)
      // User at 0.3, Dest at 0.9 (near end) = forward correct (dest > user)
      // User at 0.7, Dest at 0.9 (near end) = forward correct (dest > user)
      // User at 0.7, Dest at 0.1 (near start) = reverse correct (dest < user)
      const forwardIsCorrect = destNearSegEnd && destPositionRatio > userPositionRatio - 0.1;
      const reverseIsCorrect = destNearSegStart && destPositionRatio < userPositionRatio + 0.1;

      const isCorrectDirection = forwardIsCorrect || reverseIsCorrect || !!destOnSegment;

      if (destNearSegEnd || destNearSegStart || destOnSegment) {
        // Find nearest point on main road to user
        // For now, use the closer of segment start/end as boarding point
        const boardingPoint: { name: string; lat: number; lng: number; locationId?: string } = distToSegStart < distToSegEnd
          ? { name: segment.startLocation?.name || 'Main Road', lat: segStartLat, lng: segStartLng, locationId: segment.startLocationId }
          : { name: segment.endLocation?.name || 'Main Road', lat: segEndLat, lng: segEndLng, locationId: segment.endLocationId };

        // If user is between start and end, estimate a highway boarding point
        // Use 1km tolerance since roads aren't perfectly straight
        const userOnMainRoad = this.isPointNearLine(
          { lat: userLat, lng: userLng },
          { lat: segStartLat, lng: segStartLng },
          { lat: segEndLat, lng: segEndLng },
          1.0, // 1km tolerance for curved roads
        );

        let finalBoardingPoint: { name: string; lat: number; lng: number; locationId?: string } = boardingPoint;
        let distanceFromUser = Math.min(distToSegStart, distToSegEnd);

        // If user is near the main road itself, use a point on the road
        if (userOnMainRoad) {
          // Project user position onto segment line (simplified)
          const nearestPointOnRoad = this.getNearestPointOnLine(
            { lat: userLat, lng: userLng },
            { lat: segStartLat, lng: segStartLng },
            { lat: segEndLat, lng: segEndLng },
          );

          // Generate a more descriptive name based on the segment
          const roadName = segment.name?.includes(' to ')
            ? segment.name.split(' to ')[0] + ' Road'
            : 'Main Road';

          finalBoardingPoint = {
            name: `${roadName} (near your location)`,
            lat: nearestPointOnRoad.lat,
            lng: nearestPointOnRoad.lng,
          };
          distanceFromUser = this.geofencingService.calculateDistance(
            { lat: userLat, lng: userLng },
            nearestPointOnRoad,
          );
        }

        candidates.push({
          ...finalBoardingPoint,
          segment,
          distanceFromUser,
          isCorrectDirection,
        });
      }
    }

    // Sort: prefer correct direction, then by distance
    candidates.sort((a, b) => {
      // Prioritize correct direction
      if (a.isCorrectDirection && !b.isCorrectDirection) return -1;
      if (!a.isCorrectDirection && b.isCorrectDirection) return 1;
      // Then by distance
      return a.distanceFromUser - b.distanceFromUser;
    });

    return candidates[0] || null;
  }

  /**
   * Get nearest point on a line segment to a given point
   */
  private getNearestPointOnLine(
    point: { lat: number; lng: number },
    lineStart: { lat: number; lng: number },
    lineEnd: { lat: number; lng: number },
  ): { lat: number; lng: number } {
    const A = point.lat - lineStart.lat;
    const B = point.lng - lineStart.lng;
    const C = lineEnd.lat - lineStart.lat;
    const D = lineEnd.lng - lineStart.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = lenSq !== 0 ? dot / lenSq : -1;

    // Clamp to segment
    param = Math.max(0, Math.min(1, param));

    return {
      lat: lineStart.lat + param * C,
      lng: lineStart.lng + param * D,
    };
  }
}