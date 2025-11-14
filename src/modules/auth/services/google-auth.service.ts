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
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
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
    private configService: ConfigService,
  ) {}

  /**
   * Verify Firebase ID Token (from your React Native app)
   */
  async verifyFirebaseToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      logger.error('Firebase token verification failed', {
        error: error.message,
        code: error.code,
      });

      if (error.code === 'auth/id-token-expired') {
        throw new UnauthorizedException('Firebase token has expired');
      } else if (error.code === 'auth/argument-error') {
        throw new UnauthorizedException('Invalid Firebase token format');
      } else if (error.code === 'auth/invalid-id-token') {
        throw new UnauthorizedException('Invalid Firebase token');
      }

      throw new UnauthorizedException('Firebase token verification failed');
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
      idToken,
    } = googleAuthDto;

    // Verify the Firebase ID token
    if (!idToken) {
      throw new BadRequestException('Firebase ID token is required');
    }

    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await this.verifyFirebaseToken(idToken);
    } catch (error) {
      logger.error('Token verification failed', {
        error: error.message,
        email,
        googleId,
      });
      throw error;
    }

    // Verify token claims match the provided data
    if (decodedToken.email !== email) {
      throw new UnauthorizedException('Token email does not match provided email');
    }

    // Extract Google ID from Firebase token
    const firebaseGoogleId = decodedToken.firebase?.identities?.['google.com']?.[0];
    if (firebaseGoogleId && firebaseGoogleId !== googleId) {
      throw new UnauthorizedException('Token Google ID does not match provided Google ID');
    }

    if (!email || !googleId) {
      throw new BadRequestException('Email and Google ID are required');
    }

    // Check if user exists with this email
    let user = await this.userRepository.findOne({ where: { email } });
    let isNewUser = false;

    if (user) {
      // ===== EXISTING USER =====
      logger.info('Existing user found', {
        userId: user.id,
        email: user.email,
        hasGoogleId: !!user.googleId,
        storedGoogleId: user.googleId,
        incomingGoogleId: googleId,
      });

      // Case 1: User registered with local auth (email/password), now signing in with Google
      if (!user.googleId && user.authProvider === AuthProvider.LOCAL) {
        logger.info('Linking Google account to existing local user', {
          userId: user.id,
          googleId,
        });
        user.googleId = googleId;
        user.authProvider = AuthProvider.GOOGLE;
      }
      // Case 2: User already has a different Google ID
      else if (user.googleId && user.googleId !== googleId) {
        logger.error('Google ID mismatch', {
          userId: user.id,
          email: user.email,
          storedGoogleId: user.googleId,
          incomingGoogleId: googleId,
        });
        throw new ConflictException(
          'This email is already registered with a different Google account',
        );
      }
      // Case 3: User has no Google ID but was registered via Google before
      else if (!user.googleId && user.authProvider === AuthProvider.GOOGLE) {
        logger.info('Updating Google ID for existing Google user', {
          userId: user.id,
          googleId,
        });
        user.googleId = googleId;
      }
      // Case 4: User already has this exact Google ID - normal login
      else if (user.googleId === googleId) {
        logger.info('User logging in with matching Google ID', {
          userId: user.id,
          googleId,
        });
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
      logger.info('Creating new user via Google auth', { email, googleId });
      isNewUser = true;

      user = this.userRepository.create({
        email,
        googleId,
        firstName: firstName || email.split('@')[0],
        lastName: lastName || '',
        profilePicture,
        phoneNumber,
        sex,
        country: country || 'Nigeria',
        language: language || 'English',
        authProvider: AuthProvider.GOOGLE,
        isVerified: true,
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
        const deviceInfoString = deviceInfo ? JSON.stringify(deviceInfo) : undefined;
        await this.deviceService.updateOrCreateDevice(user.id, fcmToken, req, deviceInfoString);
        logger.info('Device registered/updated', { userId: user.id });
      } catch (error) {
        logger.error('Failed to register device', { userId: user.id, error: error.message });
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
