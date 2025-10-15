// src/modules/auth/services/otp-login.service.ts

import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Request } from 'express';
import { User } from '../../user/entities/user.entity';
import { UserOTP, OTPType } from '../../user/entities/user-otp.entity';
import { RequestLoginOtpDto } from '../../user/dto/login-with-otp.dto';
import { VerifyLoginOtpDto } from '../../user/dto/verify-login-otp.dto';
import { UserEmailService } from '../../email/user-email.service';
import { TokenService } from './token.service';
import { DeviceService } from './device.service';
import { OtpService } from './otp.service';
import { TEST_ACCOUNTS, TEST_SETTINGS } from '@/config/test-accounts.config';
import { logger } from '@/utils/logger.util';

@Injectable()
export class OtpLoginService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserOTP)
    private otpRepository: Repository<UserOTP>,
    private userEmailService: UserEmailService,
    private tokenService: TokenService,
    private deviceService: DeviceService,
    private otpService: OtpService,
  ) {}

  async requestLoginOtp(requestLoginOtpDto: RequestLoginOtpDto, req: Request) {
    try {
      const { email } = requestLoginOtpDto;

      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      const isTestAccount = user.isTestAccount || TEST_ACCOUNTS.hasOwnProperty(email.toLowerCase());

      // Check verification requirement (skip for test accounts if bypass is enabled)
      if (!isTestAccount || !TEST_SETTINGS.bypassEmailVerification) {
        if (!user.isVerified) {
          throw new BadRequestException('Please verify your email first');
        }
      }

      // Check rate limit (skip for test accounts if security checks are bypassed)
      if (!isTestAccount || !TEST_SETTINGS.skipSecurityChecks) {
        await this.checkRateLimit(user.id);
      }

      // Generate OTP
      const otpCode = await this.otpService.generateAndSaveOTP(user.id, OTPType.LOGIN, req.ip);

      // Send OTP email
      const deviceInfo = req.headers['user-agent'] || 'Unknown device';

      await this.userEmailService.sendLoginOTP(user.email, user.firstName, otpCode, deviceInfo);

      logger.info('Login OTP sent', { userId: user.id, email: user.email, isTestAccount });

      return {
        success: true,
        message: 'Login code sent to your email',
        data: {
          email: user.email,
          isTestAccount,
        },
      };
    } catch (error) {
      console.error('ERROR in requestLoginOtp:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      throw error;
    }
  }

  async verifyLoginOtp(verifyLoginOtpDto: VerifyLoginOtpDto, req: Request) {
    const { email, otpCode, fcmToken, deviceInfo } = verifyLoginOtpDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isTestAccount = user.isTestAccount || TEST_ACCOUNTS.hasOwnProperty(email.toLowerCase());
    const bypassOTP = isTestAccount && TEST_SETTINGS.bypassOTPVerification;

    // Validate OTP (bypass for test accounts if enabled)
    if (!bypassOTP) {
      const otp = await this.otpRepository.findOne({
        where: {
          userId: user.id,
          otpCode,
          otpType: OTPType.LOGIN,
          isUsed: false,
          expiresAt: MoreThan(new Date()),
        },
      });

      if (!otp) {
        throw new UnauthorizedException('Invalid or expired OTP');
      }

      otp.isUsed = true;
      await this.otpRepository.save(otp);
    } else {
      // For test accounts with bypass, just verify the format
      if (!/^\d{6}$/.test(otpCode)) {
        throw new UnauthorizedException('Invalid OTP format');
      }
    }

    // Generate tokens
    const tokens = this.tokenService.generateTokens(user);

    // Update user login info
    user.refreshToken = tokens.refreshToken;
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Handle device
    if (fcmToken) {
      await this.deviceService.updateOrCreateDevice(
        user.id,
        fcmToken,
        req,
        deviceInfo,
        TEST_SETTINGS.bypassDeviceVerification && isTestAccount,
      );
    }

    const fullUser = await this.userRepository.findOne({ where: { id: user.id } });

    logger.info('OTP login successful', { userId: user.id, email: user.email, isTestAccount });

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: fullUser,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isTestAccount,
      },
    };
  }

  private async checkRateLimit(userId: string) {
    const recentOTP = await this.otpRepository.findOne({
      where: {
        userId,
        otpType: OTPType.LOGIN,
        createdAt: MoreThan(new Date(Date.now() - 60 * 1000)),
      },
      order: { createdAt: 'DESC' },
    });

    if (recentOTP) {
      throw new BadRequestException('Please wait before requesting a new login code');
    }
  }
}
