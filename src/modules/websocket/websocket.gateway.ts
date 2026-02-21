// src/modules/websocket/websocket.gateway.ts
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
import { JwtService } from '@nestjs/jwt';
import { logger } from '@/utils/logger.util';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/realtime',
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        logger.warn('WebSocket connection rejected: No token provided');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.userId;

      // Store user connection
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);

      // Join user-specific room
      client.join(`user:${userId}`);

      client.data.userId = userId;

      logger.info(`WebSocket client connected: ${client.id} (User: ${userId})`);
    } catch (error) {
      logger.error('WebSocket authentication error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId && this.connectedUsers.has(userId)) {
      this.connectedUsers.get(userId)?.delete(client.id);

      const userSet = this.connectedUsers.get(userId);
      if (userSet && userSet.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }

    logger.info(`WebSocket client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:location')
  handleLocationSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lat: number; lng: number; radius: number },
  ) {
    const room = `location:${data.lat.toFixed(2)},${data.lng.toFixed(2)}`;
    client.join(room);

    logger.debug(`Client ${client.id} subscribed to location updates: ${room}`);

    return { success: true, room };
  }

  @SubscribeMessage('subscribe:route')
  handleRouteSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { routeId: string },
  ) {
    const room = `route:${data.routeId}`;
    client.join(room);

    logger.debug(`Client ${client.id} subscribed to route updates: ${room}`);

    return { success: true, room };
  }

  @SubscribeMessage('subscribe:journey')
  handleJourneySubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { journeyId: string },
  ) {
    const room = `journey:${data.journeyId}`;
    client.join(room);

    logger.debug(`Client ${client.id} subscribed to journey updates: ${room}`);

    return { success: true, room };
  }

  @SubscribeMessage('share:location')
  handleLocationShare(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lat: number; lng: number; accuracy?: number; journeyId?: string },
  ) {
    const userId = client.data.userId;

    // Broadcast to users who are tracking this user
    this.server.to(`tracking:${userId}`).emit('location:update', {
      userId,
      lat: data.lat,
      lng: data.lng,
      accuracy: data.accuracy,
      journeyId: data.journeyId,
      timestamp: new Date(),
    });

    // If part of a journey, also emit to journey room
    if (data.journeyId) {
      this.server.to(`journey:${data.journeyId}`).emit('journey:location', {
        userId,
        lat: data.lat,
        lng: data.lng,
        accuracy: data.accuracy,
        timestamp: new Date(),
      });
    }

    logger.debug('Location shared', { userId, journeyId: data.journeyId });

    return { success: true };
  }

  @SubscribeMessage('start:tracking')
  handleStartTracking(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string },
  ) {
    client.join(`tracking:${data.targetUserId}`);

    logger.debug(`Client ${client.id} started tracking user: ${data.targetUserId}`);

    return { success: true };
  }

  @SubscribeMessage('stop:tracking')
  handleStopTracking(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string },
  ) {
    client.leave(`tracking:${data.targetUserId}`);

    logger.debug(`Client ${client.id} stopped tracking user: ${data.targetUserId}`);

    return { success: true };
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() _client: Socket) {
    return { success: true, timestamp: new Date() };
  }

  // Emit real-time updates (called from services)
  emitTrafficUpdate(locationId: string, data: any) {
    this.server.to(`location:${locationId}`).emit('traffic:update', data);
  }

  emitRouteUpdate(routeId: string, data: any) {
    this.server.to(`route:${routeId}`).emit('route:update', data);
  }

  emitFareUpdate(routeId: string, data: any) {
    this.server.to(`route:${routeId}`).emit('fare:update', data);
  }

  emitSafetyAlert(locationId: string, data: any) {
    this.server.to(`location:${locationId}`).emit('safety:alert', data);
  }

  emitNotificationToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  emitLocationUpdate(update: {
    userId: string;
    journeyId?: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: Date;
  }) {
    // Emit to tracking clients
    this.server.to(`tracking:${update.userId}`).emit('location:update', {
      userId: update.userId,
      lat: update.latitude,
      lng: update.longitude,
      accuracy: update.accuracy,
      journeyId: update.journeyId,
      timestamp: update.timestamp,
    });

    // If part of a journey, also emit to journey room
    if (update.journeyId) {
      this.server.to(`journey:${update.journeyId}`).emit('journey:location', {
        userId: update.userId,
        lat: update.latitude,
        lng: update.longitude,
        accuracy: update.accuracy,
        timestamp: update.timestamp,
      });
    }
  }

  emitJourneyUpdate(journeyId: string, update: any) {
    this.server.to(`journey:${journeyId}`).emit('journey:update', update);
  }

  emitJourneyEvent(userId: string, event: any) {
    this.server.to(`user:${userId}`).emit('journey:event', event);
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId)!.size > 0;
  }

  /**
   * Get connected user count
   */
  getConnectedUserCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get all connected users
   */
  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }
}
