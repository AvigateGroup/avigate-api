// src/modules/auth/services/google-auth.service.ts

import {
  Injectable,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { User, AuthProvider } from '../../user/entities/user.entity';
import { GoogleAuthDto } from '../../user/dto/google-auth.dto';
import { CapturePhoneDto } from '../../user/dto/capture-phone.dto';
import { TokenService } from './token.service';
import { DeviceService } from './device.service';
import { logger } from '@/utils/logger.util';

@Injectable()
export class GoogleAuthService {
  private googleClient: OAuth2Client;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private tokenService: TokenService,
    private deviceService: DeviceService,
    private configService: ConfigService,
  ) {
    // Initialize Google OAuth Client
    const clientId = this.configService.get('GOOGLE_CLIENT_ID');
    this.googleClient = new OAuth2Client(clientId);
  }

  /**
   * Verify Google ID Token (optional but recommended for security)
   */
  async verifyGoogleToken(idToken: string): Promise<any> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.configService.get('GOOGLE_CLIENT_ID'),
      });
      return ticket.getPayload();
    } catch (error) {
      logger.error('Google token verification failed', { error: error.message });
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  async googleAuth(googleAuthDto: GoogleAuthDto, req: Request) {
    const {
      email,
      googleId,
      firstName,
      lastName,
      profilePicture,
      phoneNumber,
      sex,
      country,
      language,
      fcmToken,
      deviceInfo,
      idToken, // Optional: if you want to verify the token
    } = googleAuthDto;

    // Optional: Verify the Google ID token for added security
    if (idToken) {
      const payload = await this.verifyGoogleToken(idToken);
      if (payload.sub !== googleId || payload.email !== email) {
        throw new UnauthorizedException('Token mismatch');
      }
    }

    if (!email || !googleId) {
      throw new BadRequestException('Email and Google ID are required');
    }

    // Check if user exists with this email
    let user = await this.userRepository.findOne({ where: { email } });
    let isNewUser = false;

    if (user) {
      // ===== EXISTING USER =====
      logger.info('Existing user found', { userId: user.id, email: user.email });

      // Case 1: User registered with local auth, now signing in with Google
      if (!user.googleId && user.authProvider === AuthProvider.LOCAL) {
        logger.info('Linking Google account to existing local user', { userId: user.id });
        user.googleId = googleId;
        user.authProvider = AuthProvider.GOOGLE;
      }
      // Case 2: User has Google ID but it doesn't match
      else if (user.googleId && user.googleId !== googleId) {
        throw new ConflictException(
          'This email is already registered with a different Google account',
        );
      }
      // Case 3: User already has this Google ID - normal login

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

      // Update sex if provided and user doesn't have one
      if (sex && !user.sex) {
        user.sex = sex;
      }

      // Auto-verify Google users
      if (!user.isVerified) {
        user.isVerified = true;
        logger.info('Auto-verified user via Google', { userId: user.id });
      }

      // Update last login
      user.lastLoginAt = new Date();
    } else {
      // ===== NEW USER =====
      logger.info('Creating new user via Google auth', { email });
      isNewUser = true;

      user = this.userRepository.create({
        email,
        googleId,
        firstName: firstName || email.split('@')[0], // Fallback to email username
        lastName: lastName || '',
        profilePicture,
        phoneNumber,
        sex,
        country: country || 'Nigeria',
        language: language || 'English',
        authProvider: AuthProvider.GOOGLE,
        isVerified: true, // Auto-verify Google users
        phoneNumberCaptured: !!phoneNumber,
        lastLoginAt: new Date(),
      });
    }

    // Generate tokens
    const tokens = this.tokenService.generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.userRepository.save(user);

    // Handle device registration
    if (fcmToken) {
      try {
        // Convert deviceInfo object to string if it exists
        const deviceInfoString = deviceInfo ? JSON.stringify(deviceInfo) : undefined;

        await this.deviceService.updateOrCreateDevice(user.id, fcmToken, req, deviceInfoString);
        logger.info('Device registered/updated', { userId: user.id });
      } catch (error) {
        logger.error('Failed to register device', { userId: user.id, error: error.message });
        // Don't fail the auth flow if device registration fails
      }
    }

    // Fetch full user data
    const fullUser = await this.userRepository.findOne({ where: { id: user.id } });

    logger.info('Google authentication successful', {
      userId: user.id,
      email: user.email,
      isNewUser,
      requiresPhone: !user.phoneNumberCaptured,
    });

    return {
      success: true,
      message: isNewUser
        ? user.phoneNumberCaptured
          ? 'Registration successful! Welcome to Avigate.'
          : 'Registration successful! Please complete your profile.'
        : 'Login successful! Welcome back.',
      data: {
        user: fullUser,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        requiresPhoneNumber: !user.phoneNumberCaptured,
        isNewUser,
      },
    };
  }

  async capturePhoneNumber(user: User, capturePhoneDto: CapturePhoneDto) {
    const { phoneNumber, sex } = capturePhoneDto;

    if (!phoneNumber) {
      throw new BadRequestException('Phone number is required');
    }

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

    logger.info('Phone number captured successfully', { userId: user.id, phoneNumber });

    return {
      success: true,
      message: 'Phone number updated successfully',
      data: { user },
    };
  }
}
