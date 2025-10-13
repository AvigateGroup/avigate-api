// src/modules/auth/services/device.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
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
    const existingDevice = await this.deviceRepository.findOne({
      where: { userId, fcmToken },
    });

    const deviceData = {
      userId,
      fcmToken,
      deviceInfo: deviceInfo || req.headers['user-agent'] || 'Unknown',
      ipAddress: req.ip,
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
            req.ip,
          );
        }
      }

      logger.info('New device created', { userId, deviceId: newDevice.id });
    }
  }
}