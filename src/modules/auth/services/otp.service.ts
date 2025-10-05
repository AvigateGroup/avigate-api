// src/modules/auth/services/otp.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { UserOTP, OTPType } from '../../user/entities/user-otp.entity';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(UserOTP)
    private otpRepository: Repository<UserOTP>,
  ) {}

  async generateAndSaveOTP(
    userId: string,
    otpType: OTPType,
    ipAddress?: string,
  ): Promise<string> {
    const otpCode = this.generateOTP();
    
    await this.otpRepository.save({
      userId,
      otpCode,
      otpType,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      isUsed: false,
      ipAddress,
    });

    return otpCode;
  }

  private generateOTP(length = 6): string {
    return crypto.randomInt(0, Math.pow(10, length)).toString().padStart(length, '0');
  }
}