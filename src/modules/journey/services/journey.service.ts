// src/modules/journey/services/journey.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Journey } from '../entities/journey.entity';
import { JourneyLeg } from '../entities/journey-leg.entity';
import { RouteMatchingService } from '@/modules/route/services/route-matching.service';
import { IntelligentRouteService } from '@/modules/route/services/intelligent-route.service';
import { logger } from '@/utils/logger.util';
import { CreateJourneyDto, StartJourneyDto } from '../dto';

@Injectable()
export class JourneyService {
  constructor(
    @InjectRepository(Journey)
    private journeyRepository: Repository<Journey>,
    @InjectRepository(JourneyLeg)
    private journeyLegRepository: Repository<JourneyLeg>,
    private routeMatchingService: RouteMatchingService,
    private intelligentRouteService: IntelligentRouteService,
  ) {}

  /**
   * Create a new journey plan
   */
  async createJourney(userId: string, dto: CreateJourneyDto): Promise<Journey> {
    logger.info('Creating journey', { userId, dto });

    // Find best route
    const routeResult = await this.routeMatchingService.findEnhancedRoutes(
      dto.startLatitude,
      dto.startLongitude,
      dto.endLatitude,
      dto.endLongitude,
      dto.endLocation,
    );

    if (!routeResult.hasDirectRoute && routeResult.routes.length === 0) {
      throw new BadRequestException('No route found for this journey');
    }

    // Use the first route (best match)
    const bestRoute = routeResult.routes[0];

    // Get route composition (segments)
    // Fix: Use routeId instead of non-existent startLocationId and endLocationId
    const composition = await this.intelligentRouteService.composeRouteById(
      bestRoute.routeId!,
    );

    if (!composition) {
      throw new BadRequestException('Could not compose route segments');
    }

    // Calculate totals
    const totalDuration = composition.totalDuration;
    const totalDistance = composition.totalDistance;
    const totalMinFare = composition.minFare;
    const totalMaxFare = composition.maxFare;

    // Create journey
    const journey = this.journeyRepository.create({
      userId,
      routeId: bestRoute.routeId,
      startLocation: dto.startLocation,
      startLatitude: dto.startLatitude,
      startLongitude: dto.startLongitude,
      endLocation: dto.endLocation,
      endLatitude: dto.endLatitude,
      endLongitude: dto.endLongitude,
      endLandmark: dto.endLandmark,
      status: 'planned',
      estimatedDuration: totalDuration,
      estimatedDistance: totalDistance,
      estimatedMinFare: totalMinFare,
      estimatedMaxFare: totalMaxFare,
      trackingEnabled: dto.trackingEnabled ?? true,
      notificationsEnabled: dto.notificationsEnabled ?? true,
      metadata: {
        routeName: bestRoute.routeName,
        confidence: bestRoute.confidence,
        isReversed: bestRoute.isReversed,
        source: bestRoute.source,
      },
    });

    await this.journeyRepository.save(journey);

    // Create journey legs from segments
    const legs: JourneyLeg[] = [];
    for (let i = 0; i < composition.segments.length; i++) {
      const segment = composition.segments[i];
      const isLastLeg = i === composition.segments.length - 1;
      const isReversed = composition.reversedSegments?.includes(i) || false;

      const leg = this.journeyLegRepository.create({
        journeyId: journey.id,
        segmentId: segment.id,
        order: i + 1,
        transportMode: segment.transportModes[0] || 'taxi',
        estimatedDuration: Number(segment.estimatedDuration),
        distance: Number(segment.distance),
        minFare: Number(segment.minFare || 0),
        maxFare: Number(segment.maxFare || 0),
        status: 'pending',
        isTransferRequired: !isLastLeg,
        transferInstructions: !isLastLeg
          ? `Transfer at ${segment.endLocation?.name || 'next stop'}`
          : undefined,
        estimatedTransferWaitTime: !isLastLeg ? 5 : undefined,
        metadata: {
          segmentName: segment.name,
          isReversed,
          startLocation: segment.startLocation?.name,
          endLocation: segment.endLocation?.name,
        },
      });

      legs.push(leg);
    }

    await this.journeyLegRepository.save(legs);
    journey.legs = legs;

    logger.info('Journey created', {
      journeyId: journey.id,
      userId,
      legs: legs.length,
      hasTransfers: legs.length > 1,
    });

    return journey;
  }

  /**
   * Start journey tracking
   */
  async startJourney(journeyId: string, dto: StartJourneyDto): Promise<Journey> {
    const journey = await this.journeyRepository.findOne({
      where: { id: journeyId },
      relations: ['legs'],
    });

    if (!journey) {
      throw new NotFoundException('Journey not found');
    }

    if (journey.status !== 'planned') {
      throw new BadRequestException('Journey has already started or completed');
    }

    // Update journey status
    journey.status = 'in_progress';
    journey.actualStartTime = new Date();

    // Mark first leg as in progress
    if (journey.legs.length > 0) {
      const firstLeg = journey.legs[0];
      firstLeg.status = 'in_progress';
      firstLeg.actualStartTime = new Date();
      await this.journeyLegRepository.save(firstLeg);
    }

    await this.journeyRepository.save(journey);

    logger.info('Journey started', {
      journeyId,
      actualStartTime: journey.actualStartTime,
    });

    return journey;
  }

  /**
   * Update user location during journey
   */
  async updateUserLocation(
    userId: string,
    journeyId: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    // Store location in cache/database for real-time tracking
    // This could be Redis for better performance
    logger.info('User location updated', {
      userId,
      journeyId,
      latitude,
      longitude,
    });

    // TODO: Implement location storage
    // Options:
    // 1. Redis: SET user:location:{userId} "{lat,lng}" EX 300
    // 2. Database table: user_locations
    // 3. In-memory cache with TTL
  }

  /**
   * Get journey details
   */
  async getJourney(journeyId: string, userId: string): Promise<Journey> {
    const journey = await this.journeyRepository.findOne({
      where: { id: journeyId, userId },
      relations: [
        'legs',
        'legs.segment',
        'legs.segment.startLocation',
        'legs.segment.endLocation',
      ],
    });

    if (!journey) {
      throw new NotFoundException('Journey not found');
    }

    return journey;
  }

  /**
   * Get active journey for user
   */
  async getActiveJourney(userId: string): Promise<Journey | null> {
    const journey = await this.journeyRepository.findOne({
      where: { userId, status: 'in_progress' },
      relations: [
        'legs',
        'legs.segment',
        'legs.segment.startLocation',
        'legs.segment.endLocation',
      ],
    });

    return journey;
  }

  /**
   * Get journey history
   */
  async getJourneyHistory(userId: string, limit: number = 20): Promise<Journey[]> {
    const journeys = await this.journeyRepository.find({
      where: { userId },
      relations: ['legs'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return journeys;
  }

  /**
   * Rate a journey
   */
  async rateJourney(
    journeyId: string,
    userId: string,
    rating: number,
    feedback?: string,
  ): Promise<void> {
    const journey = await this.journeyRepository.findOne({
      where: { id: journeyId, userId },
    });

    if (!journey) {
      throw new NotFoundException('Journey not found');
    }

    if (journey.status !== 'completed') {
      throw new BadRequestException('Can only rate completed journeys');
    }

    journey.metadata = {
      ...journey.metadata,
      rating,
      feedback,
      ratedAt: new Date().toISOString(),
    };

    await this.journeyRepository.save(journey);

    logger.info('Journey rated', { journeyId, userId, rating });
  }

  /**
   * Get journey statistics
   */
  async getJourneyStatistics(userId: string): Promise<{
    totalJourneys: number;
    completedJourneys: number;
    totalDistance: number;
    totalFareSpent: number;
    averageRating: number;
    mostUsedRoute: string;
  }> {
    const journeys = await this.journeyRepository.find({
      where: { userId },
      relations: ['legs'],
    });

    const completed = journeys.filter(j => j.status === 'completed');
    const totalDistance = completed.reduce(
      (sum, j) => sum + Number(j.estimatedDistance),
      0,
    );
    const totalFare = completed.reduce((sum, j) => {
      return sum + j.legs.reduce((legSum, leg) => {
        return legSum + (Number(leg.minFare) + Number(leg.maxFare)) / 2;
      }, 0);
    }, 0);

    // Fix: Add null check for metadata
    const ratings = completed
      .filter(j => j.metadata?.rating !== undefined)
      .map(j => j.metadata!.rating);
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

    // Find most used route
    const routeCounts: Record<string, number> = {};
    completed.forEach(j => {
      const routeName = j.metadata?.routeName || 'Unknown';
      routeCounts[routeName] = (routeCounts[routeName] || 0) + 1;
    });
    
    // Fix: Handle empty object case in reduce
    const mostUsedRoute = Object.keys(routeCounts).length > 0
      ? Object.keys(routeCounts).reduce((a, b) =>
          routeCounts[a] > routeCounts[b] ? a : b
        )
      : 'None';

    return {
      totalJourneys: journeys.length,
      completedJourneys: completed.length,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalFareSpent: Math.round(totalFare),
      averageRating: Math.round(averageRating * 10) / 10,
      mostUsedRoute,
    };
  }
}