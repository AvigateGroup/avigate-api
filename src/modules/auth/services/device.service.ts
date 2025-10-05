// src/modules/auth/services/device.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { UserDevice } from '../../user/entities/user-device.entity';
import { parseDeviceInfo } from '@/utils/device.util';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(UserDevice)
    private deviceRepository: Repository<UserDevice>,
  ) {}

  async registerDevice(
    userId: string,
    fcmToken: string,
    req: Request,
    deviceInfo?: string,
    isActive: boolean = false,
  ) {
    const deviceData = parseDeviceInfo(req, deviceInfo);

    const device = this.deviceRepository.create({
      userId,
      fcmToken,
      deviceFingerprint: deviceData.fingerprint,
      deviceInfo: deviceData.deviceInfo,
      deviceType: deviceData.deviceType,
      platform: deviceData.platform,
      ipAddress: deviceData.ipAddress,
      isActive,
    } as Partial<UserDevice>);

    return await this.deviceRepository.save(device);
  }

  async updateOrCreateDevice(userId: string, fcmToken: string, req: Request, deviceInfo?: string) {
    const deviceData = parseDeviceInfo(req, deviceInfo);

    const existingDevice = await this.deviceRepository.findOne({
      where: {
        userId,
        deviceFingerprint: deviceData.fingerprint,
      },
    });

    if (existingDevice) {
      await this.updateExistingDevice(existingDevice, fcmToken, deviceData.ipAddress);
    } else {
      await this.createNewDevice(userId, fcmToken, deviceData);
    }
  }

  private async updateExistingDevice(device: UserDevice, fcmToken: string, ipAddress: string) {
    device.fcmToken = fcmToken;
    device.ipAddress = ipAddress;
    device.isActive = true;
    device.lastActiveAt = new Date();
    await this.deviceRepository.save(device);
  }

  private async createNewDevice(userId: string, fcmToken: string, deviceData: any) {
    const device = this.deviceRepository.create({
      userId,
      fcmToken,
      deviceFingerprint: deviceData.fingerprint,
      deviceInfo: deviceData.deviceInfo,
      deviceType: deviceData.deviceType,
      platform: deviceData.platform,
      ipAddress: deviceData.ipAddress,
      isActive: true,
    } as Partial<UserDevice>);

    await this.deviceRepository.save(device);
  }
}
