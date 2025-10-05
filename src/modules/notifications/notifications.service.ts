// src/modules/notifications/notifications.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as admin from 'firebase-admin';
import { UserDevice } from '../user/entities/user-device.entity';
import { logger } from '@/utils/logger.util';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    private configService: ConfigService,
    @InjectRepository(UserDevice)
    private deviceRepository: Repository<UserDevice>,
  ) {}

  onModuleInit() {
    const serviceAccount = {
      projectId: this.configService.get('FIREBASE_PROJECT_ID'),
      privateKey: this.configService.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
      clientEmail: this.configService.get('FIREBASE_CLIENT_EMAIL'),
    };

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as any),
      });
    }
  }

  async sendToUser(userId: string, notification: NotificationPayload): Promise<void> {
    const devices = await this.deviceRepository.find({
      where: { userId, isActive: true },
      select: ['fcmToken'],
    });

    const tokens = devices
      .map(d => d.fcmToken)
      .filter(token => token !== null);

    if (tokens.length === 0) {
      logger.warn(`No active devices found for user ${userId}`);
      return;
    }

    await this.sendToMultipleDevices(tokens, notification);
  }

  async sendToMultipleDevices(
    tokens: string[],
    notification: NotificationPayload,
  ): Promise<void> {
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
      // Fallback for Firebase Admin SDK versions without sendMulticast
      let successCount = 0;
      let failureCount = 0;
      const invalidTokens: string[] = [];

      for (const [idx, token] of tokens.entries()) {
        try {
          await admin.messaging().send({
            token,
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
          });
          successCount++;
        } catch (error: any) {
          failureCount++;
          // Check for invalid token error codes
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
        await this.deviceRepository.update(
          { fcmToken: In(invalidTokens) },
          { fcmToken: null },
        );
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
}

function In(invalidTokens: string[]): string | import("typeorm").FindOperator<string> | undefined {
    throw new Error('Function not implemented.');
}
