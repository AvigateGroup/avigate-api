// src/modules/journey/services/journey-notification.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { GeofencingService } from '@/modules/route/services/geofencing.service';
import { logger } from '@/utils/logger.util';
import { Journey } from '../entities/journey.entity';
import { JourneyLeg } from '../entities/journey-leg.entity';

export interface TransferPoint {
  locationId: string;
  locationName: string;
  latitude: number;
  longitude: number;
  instruction: string;
  estimatedWaitTime: number; // minutes
  nextVehicleType: string;
  nextFare: {
    min: number;
    max: number;
  };
  notificationSent?: boolean;
}

export interface JourneyProgress {
  currentLegIndex: number;
  completedLegs: number;
  totalLegs: number;
  currentStopIndex: number;
  nextStop?: {
    name: string;
    distance: number; // meters
    eta: number; // minutes
  };
  upcomingTransfer?: {
    location: string;
    distance: number; // meters
    eta: number; // minutes
  };
}

@Injectable()
export class JourneyNotificationService {
  // Notification distance thresholds (meters)
  private readonly TRANSFER_ALERT_DISTANCE = 2000; // 2km before transfer
  private readonly TRANSFER_IMMINENT_DISTANCE = 500; // 500m before transfer
  private readonly STOP_APPROACHING_DISTANCE = 300; // 300m before stop
  private readonly DESTINATION_ALERT_DISTANCE = 1000; // 1km before destination

  // Timing constants
  private readonly LOCATION_UPDATE_INTERVAL = 10000; // 10 seconds
  private readonly TRANSFER_ALERT_TIME = 5; // 5 minutes before

  constructor(
    @InjectRepository(Journey)
    private journeyRepository: Repository<Journey>,
    @InjectRepository(JourneyLeg)
    private journeyLegRepository: Repository<JourneyLeg>,
    private notificationsService: NotificationsService,
    private geofencingService: GeofencingService,
  ) {}

  /**
   * Start real-time journey tracking with notifications
   */
  async startJourneyTracking(
    journeyId: string,
    userId: string,
  ): Promise<void> {
    logger.info('Starting journey tracking', { journeyId, userId });

    const journey = await this.journeyRepository.findOne({
      where: { id: journeyId },
      relations: ['legs', 'legs.segment', 'legs.segment.startLocation', 'legs.segment.endLocation'],
    });

    if (!journey) {
      throw new Error('Journey not found');
    }

    // Send journey start notification
    await this.sendJourneyStartNotification(userId, journey);

    // Start periodic location tracking
    this.trackJourneyProgress(journeyId, userId);
  }

  /**
   * Send journey start notification
   */
  private async sendJourneyStartNotification(
    userId: string,
    journey: Journey,
  ): Promise<void> {
    const firstLeg = journey.legs[0];
    const hasTransfers = journey.legs.length > 1;

    const transferInfo = hasTransfers
      ? `\n⚠️ ${journey.legs.length - 1} transfer${journey.legs.length > 2 ? 's' : ''} required`
      : '\n✓ Direct route';

    await this.notificationsService.sendToUser(userId, {
      title: '🚀 Journey Started',
      body: `${journey.startLocation} → ${journey.endLocation}
Vehicle: ${this.getVehicleEmoji(firstLeg.transportMode)} ${this.formatVehicleType(firstLeg.transportMode)}
Fare: ₦${firstLeg.minFare}-${firstLeg.maxFare}${transferInfo}`,
      data: {
        type: 'journey_start',
        journeyId: journey.id,
        hasTransfers: hasTransfers.toString(),
        totalLegs: journey.legs.length.toString(),
      },
    });

    logger.info('Journey start notification sent', { userId, journeyId: journey.id });
  }

  /**
   * Track journey progress with periodic location updates
   */
  private async trackJourneyProgress(
    journeyId: string,
    userId: string,
  ): Promise<void> {
    const intervalId = setInterval(async () => {
      try {
        const journey = await this.journeyRepository.findOne({
          where: { id: journeyId, status: 'in_progress' },
          relations: ['legs', 'legs.segment'],
        });

        if (!journey) {
          clearInterval(intervalId);
          return;
        }

        // Get user's current location (from device/GPS)
        const userLocation = await this.getUserCurrentLocation(userId);
        if (!userLocation) {
          logger.warn('User location not available', { userId });
          return;
        }

        // Calculate progress and send notifications
        await this.processJourneyProgress(journey, userId, userLocation);

      } catch (error) {
        logger.error('Error in journey tracking', { error, journeyId });
      }
    }, this.LOCATION_UPDATE_INTERVAL);

    // Store interval ID for cleanup (you might want to store this in Redis)
    logger.info('Journey tracking started', { journeyId, interval: this.LOCATION_UPDATE_INTERVAL });
  }

  /**
   * Process journey progress and send appropriate notifications
   */
  private async processJourneyProgress(
    journey: Journey,
    userId: string,
    userLocation: { latitude: number; longitude: number },
  ): Promise<void> {
    const currentLeg = this.getCurrentLeg(journey);
    if (!currentLeg) {
      logger.warn('No current leg found', { journeyId: journey.id });
      return;
    }

    const progress = await this.calculateJourneyProgress(journey, userLocation);

    // Check for approaching stops
    if (progress.nextStop && progress.nextStop.distance <= this.STOP_APPROACHING_DISTANCE) {
      await this.sendApproachingStopNotification(userId, journey, progress.nextStop);
    }

    // Check for transfer points
    if (progress.upcomingTransfer) {
      const transferDistance = progress.upcomingTransfer.distance;

      // Send early transfer alert (2km before)
      if (
        transferDistance <= this.TRANSFER_ALERT_DISTANCE &&
        transferDistance > this.TRANSFER_IMMINENT_DISTANCE &&
        !currentLeg.transferAlertSent
      ) {
        await this.sendTransferAlertNotification(userId, journey, progress.upcomingTransfer);
        await this.journeyLegRepository.update(currentLeg.id, { transferAlertSent: true });
      }

      // Send imminent transfer alert (500m before)
      if (
        transferDistance <= this.TRANSFER_IMMINENT_DISTANCE &&
        !currentLeg.transferImminentSent
      ) {
        await this.sendTransferImminentNotification(userId, journey, progress.upcomingTransfer);
        await this.journeyLegRepository.update(currentLeg.id, { transferImminentSent: true });
      }

      // Detect arrival at transfer point
      if (transferDistance <= 100) {
        await this.handleTransferPointArrival(userId, journey, currentLeg);
      }
    }

    // Check for destination approach - FIXED
    const destinationDistance = this.geofencingService.calculateDistance(
      { lat: userLocation.latitude, lng: userLocation.longitude },
      { lat: journey.endLatitude, lng: journey.endLongitude }
    );

    if (
      destinationDistance <= this.DESTINATION_ALERT_DISTANCE &&
      !currentLeg.destinationAlertSent
    ) {
      await this.sendDestinationAlertNotification(userId, journey, destinationDistance);
      await this.journeyLegRepository.update(currentLeg.id, { destinationAlertSent: true });
    }

    // Detect arrival at final destination
    if (destinationDistance <= 100) {
      await this.handleDestinationArrival(userId, journey);
    }
  }

  /**
   * Send approaching stop notification
   */
  private async sendApproachingStopNotification(
    userId: string,
    journey: Journey,
    nextStop: { name: string; distance: number; eta: number },
  ): Promise<void> {
    await this.notificationsService.sendToUser(userId, {
      title: '📍 Approaching Stop',
      body: `${nextStop.name}\nArriving in ${nextStop.eta} minute${nextStop.eta > 1 ? 's' : ''}`,
      data: {
        type: 'approaching_stop',
        journeyId: journey.id,
        stopName: nextStop.name,
        eta: nextStop.eta.toString(),
      },
    });

    logger.info('Approaching stop notification sent', {
      userId,
      journeyId: journey.id,
      stop: nextStop.name,
    });
  }

  /**
   * Send transfer alert notification (5 minutes before)
   */
  private async sendTransferAlertNotification(
    userId: string,
    journey: Journey,
    transfer: { location: string; distance: number; eta: number },
  ): Promise<void> {
    const nextLeg = this.getNextLeg(journey);
    if (!nextLeg) return;

    await this.notificationsService.sendToUser(userId, {
      title: '⚠️ TRANSFER ALERT',
      body: `Drop at ${transfer.location} in ${transfer.eta} minutes
Next vehicle: ${this.formatVehicleType(nextLeg.transportMode)}
Fare: ₦${nextLeg.minFare}-${nextLeg.maxFare}`,
      data: {
        type: 'transfer_alert',
        journeyId: journey.id,
        transferLocation: transfer.location,
        eta: transfer.eta.toString(),
        nextVehicle: nextLeg.transportMode,
      },
    });

    logger.info('Transfer alert notification sent', {
      userId,
      journeyId: journey.id,
      location: transfer.location,
      eta: transfer.eta,
    });
  }

  /**
   * Send imminent transfer notification (500m before)
   */
  private async sendTransferImminentNotification(
    userId: string,
    journey: Journey,
    transfer: { location: string; distance: number; eta: number },
  ): Promise<void> {
    const nextLeg = this.getNextLeg(journey);
    if (!nextLeg || !nextLeg.segment?.endLocation) return;

    await this.notificationsService.sendToUser(userId, {
      title: '🔄 TRANSFER POINT AHEAD',
      body: `Prepare to drop at ${transfer.location}
Look for: ${this.formatVehicleType(nextLeg.transportMode)} to ${nextLeg.segment.endLocation.name}`,
      data: {
        type: 'transfer_imminent',
        journeyId: journey.id,
        transferLocation: transfer.location,
        priority: 'high',
      },
    });

    logger.info('Transfer imminent notification sent', {
      userId,
      journeyId: journey.id,
      location: transfer.location,
    });
  }

  /**
   * Handle arrival at transfer point
   */
  private async handleTransferPointArrival(
    userId: string,
    journey: Journey,
    currentLeg: JourneyLeg,
  ): Promise<void> {
    const nextLeg = this.getNextLeg(journey);
    if (!nextLeg || !nextLeg.segment?.endLocation) return;

    // Mark current leg as completed
    await this.journeyLegRepository.update(currentLeg.id, {
      status: 'completed',
      actualEndTime: new Date(),
    });

    // Mark next leg as active
    await this.journeyLegRepository.update(nextLeg.id, {
      status: 'in_progress',
      actualStartTime: new Date(),
    });

    // Send transfer complete notification
    await this.notificationsService.sendToUser(userId, {
      title: '🔄 TRANSFER POINT REACHED',
      body: `Current leg complete ✓
Now board: ${this.formatVehicleType(nextLeg.transportMode)} to ${nextLeg.segment.endLocation.name}
Fare: ₦${nextLeg.minFare}-${nextLeg.maxFare}
Remaining: ${this.calculateRemainingTime(journey, currentLeg)} mins`,
      data: {
        type: 'transfer_complete',
        journeyId: journey.id,
        currentLegId: currentLeg.id,
        nextLegId: nextLeg.id,
      },
    });

    logger.info('Transfer point arrival handled', {
      userId,
      journeyId: journey.id,
      completedLeg: currentLeg.id,
      nextLeg: nextLeg.id,
    });
  }

  /**
   * Send destination alert notification
   */
  private async sendDestinationAlertNotification(
    userId: string,
    journey: Journey,
    distance: number,
  ): Promise<void> {
    const eta = Math.ceil(distance / 250); // Assuming 15 km/h average speed in traffic

    await this.notificationsService.sendToUser(userId, {
      title: '🎯 DESTINATION ALERT',
      body: `Drop at ${journey.endLocation} in ${eta} minute${eta > 1 ? 's' : ''}
Look for: ${journey.endLandmark || 'Major landmarks'}`,
      data: {
        type: 'destination_alert',
        journeyId: journey.id,
        destination: journey.endLocation,
        eta: eta.toString(),
      },
    });

    logger.info('Destination alert notification sent', {
      userId,
      journeyId: journey.id,
      destination: journey.endLocation,
      eta,
    });
  }

  /**
   * Handle arrival at final destination
   */
  private async handleDestinationArrival(
    userId: string,
    journey: Journey,
  ): Promise<void> {
    // Mark journey as completed
    await this.journeyRepository.update(journey.id, {
      status: 'completed',
      actualEndTime: new Date(),
    });

    // Mark last leg as completed
    const lastLeg = journey.legs[journey.legs.length - 1];
    await this.journeyLegRepository.update(lastLeg.id, {
      status: 'completed',
      actualEndTime: new Date(),
    });

    // Calculate actual journey time
    const startTime = journey.actualStartTime || journey.createdAt;
    const endTime = new Date();
    const actualDuration = Math.ceil((endTime.getTime() - startTime.getTime()) / 60000); // minutes

    // Calculate total fare paid
    const totalFare = journey.legs.reduce((sum, leg) => {
      return sum + ((leg.minFare + leg.maxFare) / 2); // Average fare
    }, 0);

    // Send journey complete notification
    await this.notificationsService.sendToUser(userId, {
      title: '✅ ARRIVED AT DESTINATION',
      body: `${journey.endLocation}
Total Fare: ₦${Math.round(totalFare)}
Journey Time: ${actualDuration} minutes
${journey.legs.length > 1 ? `Transfers: ${journey.legs.length - 1}` : 'Direct route'}`,
      data: {
        type: 'journey_complete',
        journeyId: journey.id,
        totalFare: totalFare.toString(),
        actualDuration: actualDuration.toString(),
        totalLegs: journey.legs.length.toString(),
      },
    });

    // Send rating request
    setTimeout(async () => {
      await this.sendRatingRequest(userId, journey);
    }, 5000); // Wait 5 seconds before asking for rating

    logger.info('Journey completed', {
      userId,
      journeyId: journey.id,
      actualDuration,
      totalFare: Math.round(totalFare),
    });
  }

  /**
   * Send rating request notification
   */
  private async sendRatingRequest(userId: string, journey: Journey): Promise<void> {
    await this.notificationsService.sendToUser(userId, {
      title: '⭐ Rate Your Journey',
      body: 'How was your experience? Help us improve Avigate!',
      data: {
        type: 'rating_request',
        journeyId: journey.id,
        action: 'open_rating',
      },
    });

    logger.info('Rating request sent', { userId, journeyId: journey.id });
  }

  /**
   * Calculate journey progress
   */
  private async calculateJourneyProgress(
    journey: Journey,
    userLocation: { latitude: number; longitude: number },
  ): Promise<JourneyProgress> {
    const currentLegIndex = journey.legs.findIndex(leg => leg.status === 'in_progress');
    const currentLeg = journey.legs[currentLegIndex];

    if (!currentLeg) {
      return {
        currentLegIndex: -1,
        completedLegs: journey.legs.filter(l => l.status === 'completed').length,
        totalLegs: journey.legs.length,
        currentStopIndex: -1,
      };
    }

    // Find next stop
    const intermediateStops = currentLeg.segment.intermediateStops || [];
    let nextStop: any = null;
    let currentStopIndex = -1;

    for (let i = 0; i < intermediateStops.length; i++) {
      const stop = intermediateStops[i];
      if (!stop.locationId) continue;

      const stopLocation = await this.getLocationCoordinates(stop.locationId);
      if (!stopLocation) continue;

      // FIXED: Calculate distance with correct parameter format
      const distance = this.geofencingService.calculateDistance(
        { lat: userLocation.latitude, lng: userLocation.longitude },
        { lat: stopLocation.latitude, lng: stopLocation.longitude }
      );

      if (distance <= this.STOP_APPROACHING_DISTANCE * 2) {
        currentStopIndex = i;
        nextStop = {
          name: stop.name,
          distance,
          eta: Math.ceil(distance / 250), // 15 km/h average
        };
        break;
      }
    }

    // Find upcoming transfer
    let upcomingTransfer: any = null;
    if (currentLegIndex < journey.legs.length - 1) {
      const transferLocation = currentLeg.segment?.endLocation;
      if (!transferLocation) {
        logger.warn('Transfer location not found for current leg', { 
          journeyId: journey.id, 
          legId: currentLeg.id 
        });
      } else {
        // FIXED: Calculate transfer distance with correct parameter format
        const transferDistance = this.geofencingService.calculateDistance(
          { lat: userLocation.latitude, lng: userLocation.longitude },
          { lat: transferLocation.latitude, lng: transferLocation.longitude }
        );

        if (transferDistance <= this.TRANSFER_ALERT_DISTANCE) {
          upcomingTransfer = {
            location: transferLocation.name,
            distance: transferDistance,
            eta: Math.ceil(transferDistance / 250),
          };
        }
      }
    }

    return {
      currentLegIndex,
      completedLegs: journey.legs.filter(l => l.status === 'completed').length,
      totalLegs: journey.legs.length,
      currentStopIndex,
      nextStop,
      upcomingTransfer,
    };
  }

  /**
   * Get current active leg
   */
  private getCurrentLeg(journey: Journey): JourneyLeg | null {
    return journey.legs.find(leg => leg.status === 'in_progress') || null;
  }

  /**
   * Get next leg (for transfer notifications)
   */
  private getNextLeg(journey: Journey): JourneyLeg | null {
    const currentIndex = journey.legs.findIndex(leg => leg.status === 'in_progress');
    if (currentIndex === -1 || currentIndex === journey.legs.length - 1) {
      return null;
    }
    return journey.legs[currentIndex + 1] || null;
  }

  /**
   * Calculate remaining time for journey
   */
  private calculateRemainingTime(journey: Journey, currentLeg: JourneyLeg): number {
    const remainingLegs = journey.legs.slice(
      journey.legs.indexOf(currentLeg) + 1,
    );

    return remainingLegs.reduce((sum, leg) => {
      return sum + leg.estimatedDuration;
    }, 0);
  }

  /**
   * Get user's current location (from device tracking)
   * This should be implemented based on your location tracking mechanism
   */
  private async getUserCurrentLocation(
    userId: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    // TODO: Implement based on your location tracking system
    // Options:
    // 1. Redis cache with latest location from mobile app
    // 2. Database table with real-time location updates
    // 3. WebSocket/Socket.io for real-time location streaming
    
    // Placeholder implementation
    logger.warn('getUserCurrentLocation not fully implemented', { userId });
    return null;
  }

  /**
   * Get location coordinates by ID
   */
  private async getLocationCoordinates(
    locationId: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    // TODO: Fetch from location repository
    logger.warn('getLocationCoordinates not fully implemented', { locationId });
    return null;
  }

  /**
   * Format vehicle type for display
   */
  private formatVehicleType(transportMode: string): string {
    const types: Record<string, string> = {
      'taxi': 'Taxi',
      'bus': 'Bus',
      'keke': 'Keke NAPEP',
      'okada': 'Okada',
      'car': 'Car',
    };
    return types[transportMode.toLowerCase()] || transportMode;
  }

  /**
   * Get vehicle emoji
   */
  private getVehicleEmoji(transportMode: string): string {
    const emojis: Record<string, string> = {
      'taxi': '🚕',
      'bus': '🚌',
      'keke': '🛺',
      'okada': '🏍️',
    };
    return emojis[transportMode.toLowerCase()] || '🚗';
  }

  /**
   * Stop journey tracking
   */
  async stopJourneyTracking(journeyId: string, userId: string): Promise<void> {
    // Mark journey as cancelled or completed
    await this.journeyRepository.update(journeyId, {
      status: 'cancelled',
      actualEndTime: new Date(),
    });

    await this.notificationsService.sendToUser(userId, {
      title: 'Journey Stopped',
      body: 'Your journey tracking has been stopped.',
      data: {
        type: 'journey_stopped',
        journeyId,
      },
    });

    logger.info('Journey tracking stopped', { journeyId, userId });
  }
}