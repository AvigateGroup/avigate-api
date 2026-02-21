// src/modules/notifications/notifications.service.ts
import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere } from 'typeorm';
import * as admin from 'firebase-admin';
import { UserDevice } from '../user/entities/user-device.entity';
import { Notification, NotificationType } from './entities/notification.entity';
import { logger } from '@/utils/logger.util';
import { GetNotificationsDto } from './dto/get-notifications.dto';

export interface NotificationPayload {
  title: string;
  body: string;
  type?: NotificationType;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    private configService: ConfigService,
    @InjectRepository(UserDevice)
    private deviceRepository: Repository<UserDevice>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  onModuleInit() {
    try {
      if (!admin.apps.length) {
        const projectId = this.configService.get('FIREBASE_PROJECT_ID');
        const privateKey = this.configService.get('FIREBASE_PRIVATE_KEY');
        const clientEmail = this.configService.get('FIREBASE_CLIENT_EMAIL');

        if (projectId && privateKey && clientEmail) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              privateKey: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
              clientEmail,
            }),
          });

          logger.info('Firebase initialized successfully from environment variables');
        } else {
          logger.warn('Firebase credentials not configured. Push notifications will be disabled.');
        }
      }
    } catch (error) {
      logger.error('Failed to initialize Firebase:', error);
      logger.warn('Push notifications will be disabled');
    }
  }

  async sendToUser(userId: string, notification: NotificationPayload): Promise<Notification> {
    // Resolve type from top-level or from data.type
    const notificationType =
      notification.type ||
      (notification.data?.type as NotificationType) ||
      NotificationType.SYSTEM_ALERT;

    // Save notification to database
    const savedNotification = await this.notificationRepository.save({
      userId,
      type: notificationType,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      imageUrl: notification.imageUrl,
      actionUrl: notification.actionUrl,
      isRead: false,
    });

    // Send push notification to user's devices
    const devices = await this.deviceRepository.find({
      where: { userId, isActive: true },
      select: ['fcmToken'],
    });

    const tokens = devices.map(d => d.fcmToken).filter(token => token !== null);

    if (tokens.length === 0) {
      logger.warn(`No active devices found for user ${userId}`);
      return savedNotification;
    }

    await this.sendToMultipleDevices(tokens, notification);

    return savedNotification;
  }

  async sendToMultipleDevices(tokens: string[], notification: NotificationPayload): Promise<void> {
    if (tokens.length === 0) return;

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'avigate_alerts',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    try {
      let successCount = 0;
      let failureCount = 0;
      const invalidTokens: string[] = [];

      for (const token of tokens) {
        try {
          await admin.messaging().send({
            token,
            notification: message.notification,
            data: message.data,
            android: message.android,
            apns: message.apns,
          });
          successCount++;
        } catch (error: any) {
          failureCount++;
          if (
            error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(token);
          }
        }
      }

      logger.info(`Notifications sent: ${successCount} successful, ${failureCount} failed`);

      if (invalidTokens.length > 0) {
        await this.deviceRepository.update({ fcmToken: In(invalidTokens) }, { fcmToken: null });
        logger.info(`Removed ${invalidTokens.length} invalid FCM tokens`);
      }
    } catch (error) {
      logger.error('Push notification error:', error);
    }
  }

  async sendToTopic(topic: string, notification: NotificationPayload): Promise<void> {
    const message: admin.messaging.Message = {
      topic,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      data: notification.data || {},
    };

    try {
      await admin.messaging().send(message);
      logger.info(`Notification sent to topic: ${topic}`);
    } catch (error) {
      logger.error(`Topic notification error for ${topic}:`, error);
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    try {
      await admin.messaging().subscribeToTopic(tokens, topic);
      logger.info(`Subscribed ${tokens.length} devices to topic: ${topic}`);
    } catch (error) {
      logger.error(`Subscribe to topic error for ${topic}:`, error);
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    try {
      await admin.messaging().unsubscribeFromTopic(tokens, topic);
      logger.info(`Unsubscribed ${tokens.length} devices from topic: ${topic}`);
    } catch (error) {
      logger.error(`Unsubscribe from topic error for ${topic}:`, error);
    }
  }

  // Get user notifications with pagination and filters
  async getUserNotifications(userId: string, dto: GetNotificationsDto) {
    const { page = 1, limit = 20, type, isRead } = dto;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Notification> = { userId };
    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead;

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get unread notification count
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  // Mark notification as read/unread
  async markAsRead(notificationId: string, userId: string, isRead: boolean): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = isRead;
    return this.notificationRepository.save(notification);
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update({ userId, isRead: false }, { isRead: true });
    logger.info(`Marked all notifications as read for user ${userId}`);
  }

  // Delete notification
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const result = await this.notificationRepository.delete({ id: notificationId, userId });
    if (result.affected === 0) {
      throw new NotFoundException('Notification not found');
    }
  }

  // Delete all read notifications for user
  async deleteReadNotifications(userId: string): Promise<void> {
    await this.notificationRepository.delete({ userId, isRead: true });
    logger.info(`Deleted read notifications for user ${userId}`);
  }
}
