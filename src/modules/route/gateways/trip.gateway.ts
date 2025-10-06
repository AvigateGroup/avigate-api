// src/modules/route/gateways/trip.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TripService } from '../services/trip.service';
import { logger } from '@/utils/logger.util';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure this properly in production
  },
  namespace: '/trips',
})
export class TripGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  constructor(private tripService: TripService) {}

  handleConnection(client: AuthenticatedSocket) {
    logger.info(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.userSockets.delete(client.userId);
    }
    logger.info(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('authenticate')
  async handleAuthenticate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string },
  ) {
    client.userId = data.userId;
    this.userSockets.set(data.userId, client.id);

    logger.info(`User authenticated: ${data.userId} on socket ${client.id}`);

    // Send active trip if exists
    const activeTrip = await this.tripService.getActiveTrip(data.userId);
    if (activeTrip) {
      client.emit('active_trip', { trip: activeTrip });
    }
  }

  @SubscribeMessage('location_update')
  async handleLocationUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { tripId: string; lat: number; lng: number; accuracy?: number },
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const progress = await this.tripService.updateLocation(client.userId, data.tripId, {
        lat: data.lat,
        lng: data.lng,
        accuracy: data.accuracy,
      });

      // Send progress update back to client
      client.emit('trip_progress', { progress });

      // Send alerts if any
      if (progress.alerts.length > 0) {
        for (const alert of progress.alerts) {
          client.emit('trip_alert', { message: alert });
        }
      }
    } catch (error) {
      logger.error('Location update error:', error);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Send notification to specific user
   */
  sendToUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }
}