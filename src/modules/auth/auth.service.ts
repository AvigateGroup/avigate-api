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

  // Add these methods to your AuthService class (auth.service.ts)

    async login(loginDto: LoginDto, req: Request) {
    const { email, password, fcmToken, deviceInfo } = loginDto;

    // Find user with password
    const user = await this.userRepository.findOne({
        where: { email },
        select: ['id', 'email', 'passwordHash', 'firstName', 'lastName', 'isVerified', 'isActive', 'isTestAccount'],
    });

    if (!user) {
        throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
    }

    // Check if email is verified (skip for test accounts)
    if (!user.isTestAccount && !user.isVerified) {
        // Generate and send new OTP
        const otpCode = this.generateOTP();
        await this.otpRepository.save({
        userId: user.id,
        otpCode,
        otpType: OTPType.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isUsed: false,
        ipAddress: req.ip,
        });

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

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Update user
    user.refreshToken = tokens.refreshToken;
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Handle device registration
    if (fcmToken) {
        const deviceData = parseDeviceInfo(req, deviceInfo);
        
        // Check if device exists
        const existingDevice = await this.deviceRepository.findOne({
        where: { 
            userId: user.id,
            deviceFingerprint: deviceData.fingerprint,
        },
        });

        if (existingDevice) {
        // Update existing device
        existingDevice.fcmToken = fcmToken;
        existingDevice.ipAddress = deviceData.ipAddress;
        existingDevice.isActive = true;
        existingDevice.lastActiveAt = new Date();
        await this.deviceRepository.save(existingDevice);
        } else {
        // Create new device
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
    }

    // Get full user data
    const fullUser = await this.userRepository.findOne({ where: { id: user.id } });

    return {
        success: true,
        message: 'Login successful',
        data: {
        user: fullUser,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        },
    };
    }

    async verifyEmail(verifyEmailDto: VerifyEmailDto, req: Request) {
    const { email, otpCode } = verifyEmailDto;

    // Find user
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
        throw new UnauthorizedException('Invalid email');
    }

    if (user.isVerified) {
        throw new BadRequestException('Email already verified');
    }

    // Find valid OTP
    const otp = await this.otpRepository.findOne({
        where: {
        userId: user.id,
        otpCode,
        otpType: OTPType.EMAIL_VERIFICATION,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
        },
    });

    if (!otp) {
        throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Mark OTP as used
    otp.isUsed = true;
    await this.otpRepository.save(otp);

    // Verify user
    user.isVerified = true;
    
    // Generate tokens
    const tokens = this.generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await this.userRepository.save(user);

    // Activate user's devices
    await this.deviceRepository.update(
        { userId: user.id },
        { isActive: true }
    );

    return {
        success: true,
        message: 'Email verified successfully',
        data: {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
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

    // Check for recent OTP (rate limiting)
    const recentOTP = await this.otpRepository.findOne({
        where: {
        userId: user.id,
        otpType: OTPType.EMAIL_VERIFICATION,
        createdAt: MoreThan(new Date(Date.now() - 60 * 1000)), // Within last minute
        },
        order: { createdAt: 'DESC' },
    });

    if (recentOTP) {
        throw new BadRequestException('Please wait before requesting a new verification code');
    }

    // Generate new OTP
    const otpCode = this.generateOTP();
    await this.otpRepository.save({
        userId: user.id,
        otpCode,
        otpType: OTPType.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isUsed: false,
        ipAddress: req.ip,
    });

    // Send email
    await this.userEmailService.sendWelcomeEmail(user.email, user.firstName, otpCode);

    return {
        success: true,
        message: 'Verification code sent successfully',
        data: {
        email: user.email,
        },
    };
    }

    async refreshToken(refreshToken: string) {
    if (!refreshToken) {
        throw new UnauthorizedException('Refresh token is required');
    }

    try {
        // Verify refresh token
        const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        });

        // Find user with refresh token
        const user = await this.userRepository.findOne({
        where: { id: payload.userId },
        select: ['id', 'email', 'refreshToken', 'refreshTokenExpiresAt', 'isActive'],
        });

        if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
        }

        // Verify stored refresh token matches
        if (user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
        }

        // Check if refresh token is expired
        if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
        }

        // Generate new tokens
        const tokens = this.generateTokens(user);

        // Update user's refresh token
        user.refreshToken = tokens.refreshToken;
        user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await this.userRepository.save(user);

        return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        },
        };
    } catch (error) {
        throw new UnauthorizedException('Invalid or expired refresh token');
    }
    }

    async logout(user: User, fcmToken?: string) {
    // Clear refresh token
    await this.userRepository.update(
        { id: user.id },
        { 
        refreshToken: null,
        refreshTokenExpiresAt: null,
        }
    );

    // Deactivate device if fcmToken provided
    if (fcmToken) {
        await this.deviceRepository.update(
        { 
            userId: user.id,
            fcmToken,
        },
        { isActive: false }
        );
    }

    return {
        success: true,
        message: 'Logout successful',
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