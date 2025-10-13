// src/modules/auth/services/google-auth.service.ts

import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { User, AuthProvider } from '../../user/entities/user.entity';
import { GoogleAuthDto } from '../../user/dto/google-auth.dto';
import { CapturePhoneDto } from '../../user/dto/capture-phone.dto';
import { TokenService } from './token.service';
import { DeviceService } from './device.service';
import { logger } from '@/utils/logger.util';

@Injectable()
export class GoogleAuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private tokenService: TokenService,
    private deviceService: DeviceService,
  ) {}

  async googleAuth(googleAuthDto: GoogleAuthDto, req: Request) {
    const { email, googleId, firstName, lastName, profilePicture, phoneNumber, sex, country, language, fcmToken, deviceInfo } = googleAuthDto;

    // Check if user exists with this email
    let user = await this.userRepository.findOne({ where: { email } });

    if (user) {
      // User exists - update Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = AuthProvider.GOOGLE;
      }

      // Check if this Google ID matches
      if (user.googleId !== googleId) {
        throw new ConflictException('Email is already registered with a different Google account');
      }

      // Update profile picture if provided and user doesn't have one
      if (profilePicture && !user.profilePicture) {
        user.profilePicture = profilePicture;
      }

      // Update phone number if provided and user doesn't have one
      if (phoneNumber && !user.phoneNumber) {
        const existingPhone = await this.userRepository.findOne({ where: { phoneNumber } });
        if (existingPhone && existingPhone.id !== user.id) {
          throw new ConflictException('Phone number is already in use');
        }
        user.phoneNumber = phoneNumber;
        user.phoneNumberCaptured = true;
      }

      // Auto-verify Google users
      if (!user.isVerified) {
        user.isVerified = true;
      }

      // Update last login
      user.lastLoginAt = new Date();

    } else {
      // Create new user
      user = this.userRepository.create({
        email,
        googleId,
        firstName,
        lastName,
        profilePicture,
        phoneNumber,
        sex,
        country: country || 'Nigeria',
        language: language || 'English',
        authProvider: AuthProvider.GOOGLE,
        isVerified: true, // Auto-verify Google users
        phoneNumberCaptured: !!phoneNumber,
      });
    }

    // Generate tokens
    const tokens = this.tokenService.generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.userRepository.save(user);

    // Handle device
    if (fcmToken) {
      await this.deviceService.updateOrCreateDevice(user.id, fcmToken, req, deviceInfo);
    }

    const fullUser = await this.userRepository.findOne({ where: { id: user.id } });

    logger.info('Google authentication successful', { userId: user.id, email: user.email });

    return {
      success: true,
      message: user.phoneNumberCaptured ? 'Login successful' : 'Registration successful. Please complete your profile.',
      data: {
        user: fullUser,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        requiresPhoneNumber: !user.phoneNumberCaptured,
      },
    };
  }

  async capturePhoneNumber(user: User, capturePhoneDto: CapturePhoneDto) {
    const { phoneNumber, sex } = capturePhoneDto;

    // Check if phone number is already in use
    const existingUser = await this.userRepository.findOne({ where: { phoneNumber } });
    if (existingUser && existingUser.id !== user.id) {
      throw new ConflictException('Phone number is already in use');
    }

    user.phoneNumber = phoneNumber;
    user.phoneNumberCaptured = true;
    
    if (sex) {
      user.sex = sex;
    }

    await this.userRepository.save(user);

    logger.info('Phone number captured successfully', { userId: user.id });

    return {
      success: true,
      message: 'Phone number updated successfully',
      data: { user },
    };
  }
}