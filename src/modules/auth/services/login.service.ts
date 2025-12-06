// src/modules/auth/services/login.service.ts

import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Request } from 'express';
import { User } from '../../user/entities/user.entity';
import { UserOTP, OTPType } from '../../user/entities/user-otp.entity';
import { RequestLoginOtpDto } from '../../user/dto/request-login-otp.dto';
import { VerifyLoginOtpDto } from '../../user/dto/verify-login-otp.dto';
import { UserEmailService } from '../../email/user-email.service';
import { TokenService } from './token.service';
import { DeviceService } from './device.service';
import { OtpService } from './otp.service';
import { TEST_ACCOUNTS, TEST_SETTINGS } from '@/config/test-accounts.config';
import { logger } from '@/utils/logger.util';

@Injectable()
export class LoginService {
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

  /**
   * Step 1: Request login OTP
   */
  async requestLoginOtp(requestLoginOtpDto: RequestLoginOtpDto, req: Request) {
    const { email } = requestLoginOtpDto;

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'firstName', 'lastName', 'isVerified', 'isActive', 'isTestAccount'],
    });

    // SPECIFIC ERROR: User not found
    if (!user) {
      throw new UnauthorizedException(
        "No account found with this email. Please sign up if you don't have an account.",
      );
    }

    // SPECIFIC ERROR: Account deactivated
    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated. Please contact support.');
    }

    // Check if this is a test account
    const isTestAccount = user.isTestAccount || TEST_ACCOUNTS.hasOwnProperty(email.toLowerCase());

    // Handle unverified users (skip for test accounts if bypass is enabled)
    if (!isTestAccount || !TEST_SETTINGS.bypassEmailVerification) {
      if (!user.isVerified) {
        return this.handleUnverifiedUser(user, req);
      }
    }

    // Check rate limit for OTP requests (skip for test accounts if security checks are bypassed)
    if (!isTestAccount || !TEST_SETTINGS.skipSecurityChecks) {
      await this.checkOtpRateLimit(user.id);
    }

    // Generate and send OTP
    const otpCode = await this.otpService.generateAndSaveOTP(
      user.id,
      OTPType.LOGIN_VERIFICATION,
      req.ip,
    );

    // Send OTP email
    const deviceInfo = req.headers['user-agent'] || 'Unknown device';
    await this.userEmailService.sendLoginOTP(user.email, user.firstName, otpCode, deviceInfo);

    logger.info('Login OTP sent', {
      userId: user.id,
      email: user.email,
      isTestAccount,
    });

    return {
      success: true,
      message: 'A verification code has been sent to your email.',
      data: {
        email: user.email,
        requiresOtpVerification: true,
        isTestAccount,
      },
    };
  }

  /**
   * Step 2: Verify OTP and complete login
   */
  async verifyLoginOtp(verifyLoginOtpDto: VerifyLoginOtpDto, req: Request) {
    const { email, otpCode, fcmToken, deviceInfo } = verifyLoginOtpDto;

    // Find user
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'firstName', 'lastName', 'isVerified', 'isActive', 'isTestAccount'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isTestAccount = user.isTestAccount || TEST_ACCOUNTS.hasOwnProperty(email.toLowerCase());
    const bypassOTP = isTestAccount && TEST_SETTINGS.bypassOTPVerification;

    // Validate OTP (bypass for test accounts if enabled)
    if (!bypassOTP) {
      const otp = await this.otpRepository.findOne({
        where: {
          userId: user.id,
          otpCode,
          otpType: OTPType.LOGIN_VERIFICATION,
          isUsed: false,
          expiresAt: MoreThan(new Date()),
        },
      });

      if (!otp) {
        // Increment attempts for tracking
        const existingOtp = await this.otpRepository.findOne({
          where: {
            userId: user.id,
            otpCode,
            otpType: OTPType.LOGIN_VERIFICATION,
          },
          order: { createdAt: 'DESC' },
        });

        if (existingOtp) {
          existingOtp.attempts += 1;
          await this.otpRepository.save(existingOtp);
        }

        throw new UnauthorizedException('Invalid or expired verification code');
      }

      // Mark OTP as used
      otp.isUsed = true;
      otp.usedAt = new Date();
      await this.otpRepository.save(otp);
    } else {
      // For test accounts with bypass, just verify the format
      if (!/^\d{6}$/.test(otpCode)) {
        throw new UnauthorizedException('Invalid verification code format');
      }
    }

    // Generate tokens
    const tokens = this.tokenService.generateTokens(user);

    // Update user login info
    await this.updateUserLoginInfo(user, tokens);

    // Handle device registration
    if (fcmToken) {
      await this.deviceService.updateOrCreateDevice(
        user.id,
        fcmToken,
        req,
        deviceInfo,
        TEST_SETTINGS.bypassDeviceVerification && isTestAccount,
      );
    }

    // Fetch full user data
    const fullUser = await this.userRepository.findOne({ where: { id: user.id } });

    logger.info('Login successful after OTP verification', {
      userId: user.id,
      email: user.email,
      isTestAccount,
    });

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

  async resendLoginOtp(email: string, req: Request) {
    // Find user
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'firstName', 'isVerified', 'isActive', 'isTestAccount'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isTestAccount = user.isTestAccount || TEST_ACCOUNTS.hasOwnProperty(email.toLowerCase());

    // Check verification requirement
    if (!isTestAccount || !TEST_SETTINGS.bypassEmailVerification) {
      if (!user.isVerified) {
        throw new BadRequestException('Please verify your email first');
      }
    }

    // Check rate limit
    if (!isTestAccount || !TEST_SETTINGS.skipSecurityChecks) {
      await this.checkOtpRateLimit(user.id);
    }

    // Invalidate any existing unused login OTPs
    await this.otpRepository.update(
      {
        userId: user.id,
        otpType: OTPType.LOGIN_VERIFICATION,
        isUsed: false,
      },
      { isUsed: true, usedAt: new Date() },
    );

    // Generate new OTP
    const otpCode = await this.otpService.generateAndSaveOTP(
      user.id,
      OTPType.LOGIN_VERIFICATION,
      req.ip,
    );

    // Send OTP email
    const deviceInfo = req.headers['user-agent'] || 'Unknown device';
    await this.userEmailService.sendLoginOTP(user.email, user.firstName, otpCode, deviceInfo);

    logger.info('Login OTP resent', {
      userId: user.id,
      email: user.email,
      isTestAccount,
    });

    return {
      success: true,
      message: 'A new verification code has been sent to your email.',
      data: {
        email: user.email,
        isTestAccount,
      },
    };
  }

  private async handleUnverifiedUser(user: User, req: Request) {
    const otpCode = await this.otpService.generateAndSaveOTP(
      user.id,
      OTPType.EMAIL_VERIFICATION,
      req.ip,
    );

    await this.userEmailService.sendWelcomeEmail(user.email, user.firstName, otpCode);

    return {
      success: false,
      message: 'Email not verified. A new verification code has been sent to your email.',
      data: {
        userId: user.id,
        email: user.email,
        requiresVerification: true,
      },
    };
  }

  private async checkOtpRateLimit(userId: string) {
    const recentOTP = await this.otpRepository.findOne({
      where: {
        userId,
        otpType: OTPType.LOGIN_VERIFICATION,
        createdAt: MoreThan(new Date(Date.now() - 60 * 1000)), // 1 minute
      },
      order: { createdAt: 'DESC' },
    });

    if (recentOTP) {
      throw new BadRequestException(
        'Please wait before requesting a new verification code. Check your email for the previous code.',
      );
    }
  }

  private async updateUserLoginInfo(
    user: User,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    user.refreshToken = tokens.refreshToken;
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);
  }
}