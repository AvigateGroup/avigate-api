// src/modules/notifications/notifications.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { NotificationsService } from './notifications.service';
import { GetNotificationsDto } from './dto/get-notifications.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { NotificationType } from './entities/notification.entity';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  async getNotifications(@CurrentUser() user: User, @Query() dto: GetNotificationsDto) {
    return this.notificationsService.getUserNotifications(user.id, dto);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser() user: User) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return {
      success: true,
      count,
    };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read/unread' })
  async markAsRead(
    @Param('id') notificationId: string,
    @CurrentUser() user: User,
    @Body() dto: MarkReadDto,
  ) {
    const notification = await this.notificationsService.markAsRead(
      notificationId,
      user.id,
      dto.isRead,
    );

    return {
      success: true,
      data: notification,
    };
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser() user: User) {
    await this.notificationsService.markAllAsRead(user.id);

    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  async deleteNotification(@Param('id') notificationId: string, @CurrentUser() user: User) {
    await this.notificationsService.deleteNotification(notificationId, user.id);

    return {
      success: true,
      message: 'Notification deleted',
    };
  }

  @Delete('read/all')
  @ApiOperation({ summary: 'Delete all read notifications' })
  async deleteReadNotifications(@CurrentUser() user: User) {
    await this.notificationsService.deleteReadNotifications(user.id);

    return {
      success: true,
      message: 'Read notifications deleted',
    };
  }

  @Post('test')
  @ApiOperation({ summary: 'Send test notification' })
  async sendTestNotification(@CurrentUser() user: User) {
    await this.notificationsService.sendToUser(user.id, {
      title: 'Test Notification',
      body: 'This is a test notification from Avigate',
      type: NotificationType.SYSTEM_ALERT,
      data: { type: 'test' },
    });

    return {
      success: true,
      message: 'Test notification sent',
    };
  }
}
