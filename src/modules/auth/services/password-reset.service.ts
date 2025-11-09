// src/modules/auth/services/password-reset.service.ts

import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Request } from 'express';
import { User, AuthProvider } from '../../user/entities/user.entity';
import { UserOTP, OTPType } from '../../user/entities/user-otp.entity';
import { ForgotPasswordDto } from '../../user/dto/forgot-password.dto';
import { ResetPasswordDto } from '../../user/dto/reset-password.dto';
import { UserEmailService } from '../../email/user-email.service';
import { UserUpdatesEmailService } from '../../email/user-updates-email.service';
import { OtpService } from './otp.service';
import { logger } from '@/utils/logger.util';

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserOTP)
    private otpRepository: Repository<UserOTP>,
    private userEmailService: UserEmailService,
    private userUpdatesEmailService: UserUpdatesEmailService,
    private otpService: OtpService,
  ) {}

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto, req: Request) {
    const { email } = forgotPasswordDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if user exists
      return {
        success: true,
        message: 'If an account exists with this email, a password reset code will be sent',
      };
    }

    // Check if user is using Google OAuth
    if (user.authProvider === AuthProvider.GOOGLE && !user.passwordHash) {
      throw new BadRequestException('This account uses Google sign-in. Please log in with Google.');
    }

    // Check rate limit
    await this.checkRateLimit(user.id);

    // Invalidate any existing unused password reset OTPs
    await this.otpRepository.update(
      {
        userId: user.id,
        otpType: OTPType.PASSWORD_RESET,
        isUsed: false,
      },
      { isUsed: true },
    );

    // Generate OTP
    const otpCode = await this.otpService.generateAndSaveOTP(
      user.id,
      OTPType.PASSWORD_RESET,
      req.ip,
    );

    // Send password reset email
    await this.userUpdatesEmailService.sendPasswordResetOTP(user.email, user.firstName, otpCode);

    logger.info('Password reset OTP sent', { userId: user.id, email: user.email });

    return {
      success: true,
      message: 'If an account exists with this email, a password reset code will be sent',
      data: {
        email: user.email,
      },
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, otpCode, newPassword } = resetPasswordDto;

    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'firstName', 'passwordHash', 'authProvider'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Find and validate OTP with detailed error checking
    const otp = await this.otpRepository.findOne({
      where: {
        userId: user.id,
        otpCode,
        otpType: OTPType.PASSWORD_RESET,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!otp) {
      // Check if OTP exists but has issues
      const existingOtp = await this.otpRepository.findOne({
        where: {
          userId: user.id,
          otpCode,
          otpType: OTPType.PASSWORD_RESET,
        },
        order: { createdAt: 'DESC' },
      });

      if (existingOtp) {
        // OTP exists but is invalid
        if (existingOtp.isUsed) {
          logger.warn('Attempted to use already-used OTP', { 
            userId: user.id, 
            email: user.email,
            otpCode 
          });
          throw new UnauthorizedException(
            'This reset code has already been used. Please request a new code.',
          );
        }

        if (existingOtp.expiresAt < new Date()) {
          logger.warn('Attempted to use expired OTP', { 
            userId: user.id, 
            email: user.email,
            otpCode,
            expiredAt: existingOtp.expiresAt 
          });
          throw new UnauthorizedException(
            'This reset code has expired. Please request a new code.',
          );
        }
      }

      // OTP doesn't exist or code is wrong
      logger.warn('Invalid OTP code attempt', { 
        userId: user.id, 
        email: user.email,
        otpCode 
      });
      throw new UnauthorizedException(
        'Invalid reset code. Please check the code and try again.',
      );
    }

    // Mark OTP as used
    otp.isUsed = true;
    otp.usedAt = new Date();
    await this.otpRepository.save(otp);

    // Update password
    user.passwordHash = newPassword; // Will be hashed by BeforeInsert/BeforeUpdate hook
    user.refreshToken = null; // Invalidate all sessions
    user.refreshTokenExpiresAt = null;
    await this.userRepository.save(user);

    // Send confirmation email
    await this.userEmailService.sendPasswordChangeConfirmation(
      user.email,
      user.firstName,
      new Date().toLocaleString(),
    );

    logger.info('Password reset successful', { userId: user.id, email: user.email });

    return {
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    };
  }

  private async checkRateLimit(userId: string) {
    const recentOTP = await this.otpRepository.findOne({
      where: {
        userId,
        otpType: OTPType.PASSWORD_RESET,
        createdAt: MoreThan(new Date(Date.now() - 60 * 1000)), // 1 minute
      },
      order: { createdAt: 'DESC' },
    });

    if (recentOTP) {
      throw new BadRequestException(
        'Please wait before requesting a new password reset code. Check your email for the previous code.',
      );
    }
  }
}