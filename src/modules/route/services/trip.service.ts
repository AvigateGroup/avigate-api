// src/modules/route/services/trip.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActiveTrip, TripStatus } from '../entities/active-trip.entity';
import { Route } from '../entities/route.entity';
import { RouteStep } from '../entities/route-step.entity';
import { GeofencingService } from './geofencing.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { logger } from '@/utils/logger.util';

export interface LocationUpdate {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: Date;
}

export interface TripProgressUpdate {
  currentStepCompleted: boolean;
  nextStepStarted: boolean;
  distanceToNextWaypoint: number;
  estimatedArrival: Date;
  alerts: string[];
}

@Injectable()
export class TripService {
  constructor(
    @InjectRepository(ActiveTrip)
    private tripRepository: Repository<ActiveTrip>,
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    @InjectRepository(RouteStep)
    private stepRepository: Repository<RouteStep>,
    private geofencingService: GeofencingService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Start a new trip
   */
  async startTrip(
    userId: string,
    routeId: string,
    startLocation: { lat: number; lng: number },
  ): Promise<ActiveTrip> {
    // Check if user already has an active trip
    const existingTrip = await this.tripRepository.findOne({
      where: {
        userId,
        status: TripStatus.IN_PROGRESS,
      },
    });

    if (existingTrip) {
      throw new BadRequestException(
        'You already have an active trip. Please complete or cancel it first.',
      );
    }

    // Get route with steps
    const route = await this.routeRepository.findOne({
      where: { id: routeId },
      relations: ['steps', 'startLocation', 'endLocation'],
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    // Sort steps
    route.steps.sort((a, b) => a.stepOrder - b.stepOrder);
    const firstStep = route.steps[0];

    // Calculate ETA
    const estimatedArrival = this.geofencingService.calculateETA(
      startLocation,
      {
        lat: Number(route.endLocation.latitude),
        lng: Number(route.endLocation.longitude),
      },
      30, // average speed in km/h
    );

    // Create trip
    const trip = this.tripRepository.create({
      userId,
      routeId,
      currentStepId: firstStep.id,
      startLocationId: route.startLocationId,
      endLocationId: route.endLocationId,
      currentLat: startLocation.lat,
      currentLng: startLocation.lng,
      status: TripStatus.IN_PROGRESS,
      startedAt: new Date(),
      estimatedArrival,
      locationHistory: [
        {
          lat: startLocation.lat,
          lng: startLocation.lng,
          timestamp: new Date().toISOString(),
        },
      ],
      stepProgress: {
        [firstStep.id]: {
          startedAt: new Date().toISOString(),
        },
      },
      notificationsSent: {},
    });

    await this.tripRepository.save(trip);

    // Send welcome notification
    await this.notificationsService.sendToUser(userId, {
      title: 'Trip Started',
      body: `Your journey to ${route.endLocation.name} has begun. Safe travels!`,
      data: {
        type: 'trip_started',
        tripId: trip.id,
        routeId: route.id,
      },
    });

    logger.info(`Trip started: ${trip.id} for user ${userId}`);

    return trip;
  }

  /**
   * Update user location and check progress
   */
  async updateLocation(
    tripId: string,
    userId: string,
    location: LocationUpdate,
  ): Promise<TripProgressUpdate> {
    const trip = await this.tripRepository.findOne({
      where: { id: tripId, userId },
      relations: ['route', 'route.steps', 'currentStep', 'route.endLocation'],
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status !== TripStatus.IN_PROGRESS) {
      throw new BadRequestException('Trip is not in progress');
    }

    // Update location
    trip.currentLat = location.lat;
    trip.currentLng = location.lng;

    // Add to location history
    if (!trip.locationHistory) {
      trip.locationHistory = [];
    }
    trip.locationHistory.push({
      lat: location.lat,
      lng: location.lng,
      timestamp: (location.timestamp || new Date()).toISOString(),
      accuracy: location.accuracy,
    });

    // Sort steps
    trip.route.steps.sort((a, b) => a.stepOrder - b.stepOrder);

    const currentStep = trip.currentStep;
    const currentStepIndex = trip.route.steps.findIndex(s => s.id === currentStep.id);

    const alerts: string[] = [];
    let currentStepCompleted = false;
    let nextStepStarted = false;

    // Check if arrived at current step's destination
    const stepDestination = {
      lat: Number(currentStep.toLocation?.latitude || trip.route.endLocation.latitude),
      lng: Number(currentStep.toLocation?.longitude || trip.route.endLocation.longitude),
    };

    const distanceToDestination = this.geofencingService.calculateDistance(
      { lat: location.lat, lng: location.lng },
      stepDestination,
    );

    // Check arrival at current step
    if (
      this.geofencingService.hasArrived({ lat: location.lat, lng: location.lng }, stepDestination)
    ) {
      currentStepCompleted = true;

      // Update step progress
      if (!trip.stepProgress[currentStep.id].completedAt) {
        trip.stepProgress[currentStep.id].completedAt = new Date().toISOString();

        const notificationKey = `step_completed_${currentStep.id}`;
        if (!trip.notificationsSent[notificationKey]) {
          const isLastStep = currentStepIndex === trip.route.steps.length - 1;

          if (isLastStep) {
            // Trip completed
            await this.completeTrip(trip.id, userId);
            alerts.push('Trip completed! You have arrived at your destination.');
          } else {
            // Move to next step
            const nextStep = trip.route.steps[currentStepIndex + 1];
            trip.currentStepId = nextStep.id;
            trip.stepProgress[nextStep.id] = {
              startedAt: new Date().toISOString(),
            };
            nextStepStarted = true;

            await this.notificationsService.sendToUser(userId, {
              title: 'Next Step',
              body: `Step ${currentStepIndex + 1} completed. Now: ${nextStep.instructions.substring(0, 100)}...`,
              data: {
                type: 'step_completed',
                tripId: trip.id,
                stepId: nextStep.id,
              },
            });

            alerts.push(`Step ${currentStepIndex + 1} completed. Moving to next step.`);
            trip.notificationsSent[notificationKey] = true;
          }
        }
      }
    }
    // Check if approaching
    else if (
      this.geofencingService.isApproaching(
        { lat: location.lat, lng: location.lng },
        stepDestination,
      )
    ) {
      const notificationKey = `approaching_${currentStep.id}`;
      if (!trip.notificationsSent[notificationKey]) {
        const locationName = currentStep.toLocation?.name || 'your destination';

        await this.notificationsService.sendToUser(userId, {
          title: 'Approaching Stop',
          body: `You are approaching ${locationName}. Get ready to alight.`,
          data: {
            type: 'approaching',
            tripId: trip.id,
            stepId: currentStep.id,
          },
        });

        alerts.push(`Approaching ${locationName}`);
        trip.notificationsSent[notificationKey] = true;
      }
    }

    // Update ETA
    trip.estimatedArrival = this.geofencingService.calculateETA(
      { lat: location.lat, lng: location.lng },
      {
        lat: Number(trip.route.endLocation.latitude),
        lng: Number(trip.route.endLocation.longitude),
      },
    );

    await this.tripRepository.save(trip);

    return {
      currentStepCompleted,
      nextStepStarted,
      distanceToNextWaypoint: distanceToDestination,
      estimatedArrival: trip.estimatedArrival,
      alerts,
    };
  }

  /**
   * Get active trip for user
   */
  async getActiveTrip(userId: string): Promise<ActiveTrip | null> {
    return this.tripRepository.findOne({
      where: {
        userId,
        status: TripStatus.IN_PROGRESS,
      },
      relations: [
        'route',
        'route.steps',
        'route.steps.fromLocation',
        'route.steps.toLocation',
        'currentStep',
      ],
    });
  }

  /**
   * Complete a trip
   */
  async completeTrip(tripId: string, userId: string): Promise<ActiveTrip> {
    const trip = await this.tripRepository.findOne({
      where: { id: tripId, userId },
      relations: ['route', 'route.endLocation'],
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    trip.status = TripStatus.COMPLETED;
    trip.completedAt = new Date();

    await this.tripRepository.save(trip);

    await this.notificationsService.sendToUser(userId, {
      title: 'Trip Completed',
      body: `You have arrived at ${trip.route.endLocation.name}. We hope you had a safe journey!`,
      data: {
        type: 'trip_completed',
        tripId: trip.id,
      },
    });

    logger.info(`Trip completed: ${trip.id} for user ${userId}`);

    return trip;
  }

  /**
   * Cancel a trip
   */
  async cancelTrip(tripId: string, userId: string, reason?: string): Promise<ActiveTrip> {
    const trip = await this.tripRepository.findOne({
      where: { id: tripId, userId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    trip.status = TripStatus.CANCELLED;
    trip.metadata = {
      ...trip.metadata,
      cancellationReason: reason,
      cancelledAt: new Date().toISOString(),
    };

    await this.tripRepository.save(trip);

    logger.info(`Trip cancelled: ${trip.id} for user ${userId}`);

    return trip;
  }

  /**
   * Get trip history for user
   */
  async getTripHistory(userId: string, limit: number = 20) {
    return this.tripRepository.find({
      where: { userId },
      relations: ['route', 'route.startLocation', 'route.endLocation'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
