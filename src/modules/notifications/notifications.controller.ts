// src/modules/notifications/notifications.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post('test')
  @ApiOperation({ summary: 'Send test notification' })
  async sendTestNotification(@CurrentUser() user: User) {
    await this.notificationsService.sendToUser(user.id, {
      title: 'Test Notification',
      body: 'This is a test notification from Avigate',
      data: { type: 'test' },
    });

    return {
      success: true,
      message: 'Test notification sent',
    };
  }
}