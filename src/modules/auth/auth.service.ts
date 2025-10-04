// src/modules/auth/auth.service.ts

import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { UserDevice } from '../user/entities/user-device.entity';
import { UserOTP, OTPType } from '../user/entities/user-otp.entity';
import { RegisterDto } from '../user/dto/register.dto';
import { LoginDto } from '../user/dto/login.dto';
import { VerifyEmailDto } from '../user/dto/verify-email.dto';
import { UserEmailService } from '../email/user-email.service';
import { parseDeviceInfo } from '@/utils/device.util';
import { TEST_ACCOUNTS } from '@/config/test-accounts.config';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserDevice)
    private deviceRepository: Repository<UserDevice>,
    @InjectRepository(UserOTP)
    private otpRepository: Repository<UserOTP>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private userEmailService: UserEmailService,
  ) {}

  async register(registerDto: RegisterDto, req: Request) {
    const { email, password, firstName, lastName, sex, phoneNumber, fcmToken, deviceInfo } = registerDto;

    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { phoneNumber }],
    });

    if (existingUser) {
      throw new ConflictException(
        existingUser.email === email
          ? 'User with this email already exists'
          : 'User with this phone number already exists',
      );
    }

    // Check if test account
    const isTestAccount = TEST_ACCOUNTS.hasOwnProperty(email.toLowerCase());

    // Create user
    const user = this.userRepository.create({
      email,
      passwordHash: password,
      firstName,
      lastName,
      sex,
      phoneNumber,
      preferredLanguage: 'English',
      isVerified: isTestAccount,
      isTestAccount,
      reputationScore: 100,
      totalContributions: 0,
      isActive: true,
    });

    await this.userRepository.save(user);

    // Test account bypass
    if (isTestAccount) {
      return this.handleTestAccountRegistration(user, req, fcmToken, deviceInfo);
    }

    // Normal registration flow
    return this.handleNormalRegistration(user, req, fcmToken, deviceInfo);
  }

  private async handleTestAccountRegistration(user: User, req: Request, fcmToken?: string, deviceInfo?: string) {
    const tokens = this.generateTokens(user);

    user.refreshToken = tokens.refreshToken;
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.userRepository.save(user);

    if (fcmToken) {
      const deviceData = parseDeviceInfo(req, deviceInfo);
      await this.deviceRepository.save({
        userId: user.id,
        fcmToken,
        deviceFingerprint: deviceData.fingerprint,
        deviceInfo: deviceData.deviceInfo,
        deviceType: deviceData.deviceType,
        platform: deviceData.platform,
        ipAddress: deviceData.ipAddress,
        isActive: true,
      });
    }

    return {
      success: true,
      message: 'Test account registration successful',
      data: {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isTestAccount: true,
      },
    };
  }

  private async handleNormalRegistration(user: User, req: Request, fcmToken?: string, deviceInfo?: string) {
    // Generate OTP
    const otpCode = this.generateOTP();
    await this.otpRepository.save({
      userId: user.id,
      otpCode,
      otpType: OTPType.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      isUsed: false,
      ipAddress: req.ip,
    });

    // Save device
    if (fcmToken) {
      const deviceData = parseDeviceInfo(req, deviceInfo);
      await this.deviceRepository.save({
        userId: user.id,
        fcmToken,
        deviceFingerprint: deviceData.fingerprint,
        deviceInfo: deviceData.deviceInfo,
        deviceType: deviceData.deviceType,
        platform: deviceData.platform,
        ipAddress: deviceData.ipAddress,
        isActive: false, // Inactive until verified
      });
    }

    // Send welcome email
    await this.userEmailService.sendWelcomeEmail(user.email, user.firstName, otpCode);

    return {
      success: true,
      message: 'Registration successful. Please verify your email to continue.',
      data: {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
        requiresVerification: true,
      },
    };
  }

  private generateTokens(user: User) {
    const payload = { userId: user.id, email: user.email };
    
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
      }),
    };
  }

  private generateOTP(length = 6): string {
    return crypto.randomInt(0, Math.pow(10, length)).toString().padStart(length, '0');
  }
}