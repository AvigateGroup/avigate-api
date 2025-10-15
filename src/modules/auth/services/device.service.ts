// src/modules/auth/services/device.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import * as crypto from 'crypto';
import { UserDevice } from '../../user/entities/user-device.entity';
import { UserEmailService } from '../../email/user-email.service';
import { User } from '../../user/entities/user.entity';
import { logger } from '@/utils/logger.util';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(UserDevice)
    private deviceRepository: Repository<UserDevice>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private userEmailService: UserEmailService,
  ) {}

  async updateOrCreateDevice(
    userId: string,
    fcmToken: string,
    req: Request,
    deviceInfo?: string,
    skipNotification: boolean = false,
  ) {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || '::1';
    const deviceInfoString = deviceInfo || userAgent;

    // CRITICAL FIX: Generate device fingerprint
    const deviceFingerprint = this.generateDeviceFingerprint(
      fcmToken,
      userAgent,
      deviceInfoString,
      ipAddress,
    );

    const existingDevice = await this.deviceRepository.findOne({
      where: { userId, fcmToken },
    });

    const deviceData = {
      userId,
      fcmToken,
      deviceFingerprint, // NOW INCLUDED!
      deviceInfo: deviceInfoString,
      ipAddress,
      isActive: true,
      lastActiveAt: new Date(),
    };

    if (existingDevice) {
      await this.deviceRepository.update(existingDevice.id, deviceData);
      logger.info('Device updated', { userId, deviceId: existingDevice.id });
    } else {
      const newDevice = this.deviceRepository.create(deviceData);
      await this.deviceRepository.save(newDevice);

      // Send new device notification (skip for test accounts if specified)
      if (!skipNotification) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (user) {
          await this.userEmailService.sendNewDeviceLoginNotification(
            user.email,
            user.firstName,
            deviceData.deviceInfo,
            ipAddress,
          );
        }
      }

      logger.info('New device created', { userId, deviceId: newDevice.id });
    }
  }

  /**
   * Generate a unique device fingerprint based on device characteristics
   * This creates a hash from FCM token, user agent, device info, and IP
   */
  private generateDeviceFingerprint(
    fcmToken: string,
    userAgent: string,
    deviceInfo: string,
    ipAddress: string,
  ): string {
    const data = `${fcmToken}-${userAgent}-${deviceInfo}-${ipAddress}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
