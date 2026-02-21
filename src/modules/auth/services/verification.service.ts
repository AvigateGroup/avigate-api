// src/modules/auth/services/verification.service.ts

import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Request } from 'express';
import { User } from '../../user/entities/user.entity';
import { UserDevice } from '../../user/entities/user-device.entity';
import { UserOTP, OTPType } from '../../user/entities/user-otp.entity';
import { VerifyEmailDto } from '../../user/dto/verify-email.dto';
import { UserEmailService } from '../../email/user-email.service';
import { UserUpdatesEmailService } from '../../email/user-updates-email.service';
import { TokenService } from './token.service';
import { OtpService } from './otp.service';
import { TEST_ACCOUNTS, TEST_SETTINGS } from '@/config/test-accounts.config';
import { logger } from '@/utils/logger.util';

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserDevice)
    private deviceRepository: Repository<UserDevice>,
    @InjectRepository(UserOTP)
    private otpRepository: Repository<UserOTP>,
    private userEmailService: UserEmailService,
    private userUpdatesEmailService: UserUpdatesEmailService,
    private tokenService: TokenService,
    private otpService: OtpService,
  ) {}

  async verifyEmail(verifyEmailDto: VerifyEmailDto, _req: Request) {
    const { email, otpCode } = verifyEmailDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Check if this is a test account with bypass enabled
    const isTestAccount = user.isTestAccount || TEST_ACCOUNTS.hasOwnProperty(email.toLowerCase());
    const bypassOTP = isTestAccount && TEST_SETTINGS.bypassOTPVerification;

    // For test accounts with bypass, accept any 6-digit code
    if (!bypassOTP) {
      const otp = await this.findValidOTP(user.id, otpCode);
      if (!otp) {
        throw new UnauthorizedException('Invalid or expired OTP');
      }
      await this.markOTPAsUsed(otp);
    } else {
      // For test accounts with bypass, just verify the format
      if (!/^\d{6}$/.test(otpCode)) {
        throw new UnauthorizedException('Invalid OTP format');
      }
    }

    await this.verifyUserAndGenerateTokens(user);
    await this.activateUserDevices(user.id);

    const tokens = this.tokenService.generateTokens(user);

    return {
      success: true,
      message: 'Email verified successfully',
      data: {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isTestAccount,
      },
    };
  }

  async resendVerification(email: string, req: Request) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Check if this is a test account
    const isTestAccount = user.isTestAccount || TEST_ACCOUNTS.hasOwnProperty(email.toLowerCase());

    // Skip rate limit for test accounts
    if (!isTestAccount || !TEST_SETTINGS.skipSecurityChecks) {
      await this.checkRateLimit(user.id);
    }

    const otpCode = await this.otpService.generateAndSaveOTP(
      user.id,
      OTPType.EMAIL_VERIFICATION,
      req.ip,
    );

    await this.userEmailService.sendWelcomeEmail(user.email, user.firstName, otpCode);

    return {
      success: true,
      message: 'Verification code sent successfully',
      data: {
        email: user.email,
        isTestAccount,
      },
    };
  }

  /**
   * Generate and send verification OTP for email changes or re-verification
   */
  async generateAndSendVerificationOtp(user: User, isEmailChange: boolean = false): Promise<void> {
    const isTestAccount =
      user.isTestAccount || TEST_ACCOUNTS.hasOwnProperty(user.email.toLowerCase());

    if (!isTestAccount || !TEST_SETTINGS.skipSecurityChecks) {
      try {
        await this.checkRateLimit(user.id);
      } catch (error) {
        logger.warn('Rate limit check failed for email verification OTP', {
          userId: user.id,
          error: error.message,
        });
        throw error;
      }
    }

    const otpCode = await this.otpService.generateAndSaveOTP(
      user.id,
      OTPType.EMAIL_VERIFICATION,
      'system-generated',
    );

    // Send verification email using the UserUpdatesEmailService
    await this.userUpdatesEmailService.sendEmailVerificationOTP(
      user.email,
      user.firstName,
      otpCode,
      isEmailChange,
    );

    logger.info('Verification OTP sent successfully', {
      userId: user.id,
      email: user.email,
      isEmailChange,
    });
  }

  private async findValidOTP(userId: string, otpCode: string) {
    return this.otpRepository.findOne({
      where: {
        userId,
        otpCode,
        otpType: OTPType.EMAIL_VERIFICATION,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
    });
  }

  private async markOTPAsUsed(otp: UserOTP) {
    otp.isUsed = true;
    await this.otpRepository.save(otp);
  }

  private async verifyUserAndGenerateTokens(user: User) {
    user.isVerified = true;

    const tokens = this.tokenService.generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.userRepository.save(user);
  }

  private async activateUserDevices(userId: string) {
    await this.deviceRepository.update({ userId }, { isActive: true });
  }

  private async checkRateLimit(userId: string) {
    const recentOTP = await this.otpRepository.findOne({
      where: {
        userId,
        otpType: OTPType.EMAIL_VERIFICATION,
        createdAt: MoreThan(new Date(Date.now() - 60 * 1000)),
      },
      order: { createdAt: 'DESC' },
    });

    if (recentOTP) {
      throw new BadRequestException('Please wait before requesting a new verification code');
    }
  }
}
