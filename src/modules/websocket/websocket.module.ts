// src/modules/websocket/websocket.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WebsocketGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';

@Module({
  imports: [AuthModule],
  providers: [WebsocketGateway, WebsocketService],
  exports: [WebsocketService, WebsocketGateway],
})
export class WebsocketModule {}
