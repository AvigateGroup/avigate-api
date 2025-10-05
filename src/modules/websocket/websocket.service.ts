// src/modules/websocket/websocket.service.ts
import { Injectable } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';

@Injectable()
export class WebsocketService {
  constructor(private websocketGateway: WebsocketGateway) {}

  sendTrafficUpdate(locationId: string, data: any) {
    this.websocketGateway.emitTrafficUpdate(locationId, data);
  }

  sendRouteUpdate(routeId: string, data: any) {
    this.websocketGateway.emitRouteUpdate(routeId, data);
  }

  sendFareUpdate(routeId: string, data: any) {
    this.websocketGateway.emitFareUpdate(routeId, data);
  }

  sendSafetyAlert(locationId: string, data: any) {
    this.websocketGateway.emitSafetyAlert(locationId, data);
  }

  sendNotification(userId: string, notification: any) {
    this.websocketGateway.emitNotificationToUser(userId, notification);
  }
}
