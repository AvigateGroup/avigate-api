// src/modules/websocket/websocket.service.ts
import { Injectable } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { logger } from '@/utils/logger.util';

export interface LocationUpdate {
  userId: string;
  journeyId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

export interface JourneyUpdate {
  journeyId: string;
  type: 'progress' | 'transfer' | 'destination' | 'complete';
  data: any;
}

@Injectable()
export class WebsocketService {
  constructor(private websocketGateway: WebsocketGateway) {}

  /**
   * Send traffic update to clients subscribed to a location
   */
  sendTrafficUpdate(locationId: string, data: any) {
    this.websocketGateway.emitTrafficUpdate(locationId, data);
    logger.debug('Traffic update sent', { locationId });
  }

  /**
   * Send route update to clients subscribed to a route
   */
  sendRouteUpdate(routeId: string, data: any) {
    this.websocketGateway.emitRouteUpdate(routeId, data);
    logger.debug('Route update sent', { routeId });
  }

  /**
   * Send fare update to clients subscribed to a route
   */
  sendFareUpdate(routeId: string, data: any) {
    this.websocketGateway.emitFareUpdate(routeId, data);
    logger.debug('Fare update sent', { routeId });
  }

  /**
   * Send safety alert to clients in a location
   */
  sendSafetyAlert(locationId: string, data: any) {
    this.websocketGateway.emitSafetyAlert(locationId, data);
    logger.debug('Safety alert sent', { locationId });
  }

  /**
   * Send notification to a specific user
   */
  sendNotification(userId: string, notification: any) {
    this.websocketGateway.emitNotificationToUser(userId, notification);
    logger.debug('Notification sent to user', { userId });
  }

  /**
   * Send location update to tracking clients
   */
  sendLocationUpdate(update: LocationUpdate) {
    this.websocketGateway.emitLocationUpdate(update);
    logger.debug('Location update sent', { 
      userId: update.userId, 
      journeyId: update.journeyId 
    });
  }

  /**
   * Send journey progress update
   */
  sendJourneyUpdate(journeyId: string, update: JourneyUpdate) {
    this.websocketGateway.emitJourneyUpdate(journeyId, update);
    logger.debug('Journey update sent', { journeyId, type: update.type });
  }

  /**
   * Broadcast journey event to user
   */
  sendJourneyEvent(userId: string, event: {
    type: 'start' | 'stop' | 'transfer' | 'destination' | 'complete';
    journeyId: string;
    data?: any;
  }) {
    this.websocketGateway.emitJourneyEvent(userId, event);
    logger.debug('Journey event sent', { userId, type: event.type });
  }
}