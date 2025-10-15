// src/modules/auth/services/registration.service.ts
// FIXED VERSION - Properly hashes password before saving

import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { User, AuthProvider } from '../../user/entities/user.entity';
import { RegisterDto } from '../../user/dto/register.dto';
import { UserEmailService } from '../../email/user-email.service';
import { DeviceService } from './device.service';
import { OtpService } from './otp.service';
import { OTPType } from '../../user/entities/user-otp.entity';
import { TEST_ACCOUNTS, TEST_SETTINGS } from '@/config/test-accounts.config';
import { logger } from '@/utils/logger.util';

@Injectable()
export class RegistrationService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private userEmailService: UserEmailService,
    private deviceService: DeviceService,
    private otpService: OtpService,
  ) {}

  async register(registerDto: RegisterDto, req: Request) {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        sex,
        phoneNumber,
        country,
        language,
        fcmToken,
        deviceInfo,
      } = registerDto;

      // Check if email already exists
      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      // Check if phone number already exists (if provided)
      if (phoneNumber) {
        const existingPhone = await this.userRepository.findOne({ where: { phoneNumber } });
        if (existingPhone) {
          throw new ConflictException('Phone number already exists');
        }
      }

      // Check if this is a test account
      const isTestAccount = TEST_ACCOUNTS.hasOwnProperty(email.toLowerCase());
      const testAccountConfig = isTestAccount ? TEST_ACCOUNTS[email.toLowerCase()] : null;

      // CRITICAL FIX: Hash the password before saving
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user with HASHED password
      const user = this.userRepository.create({
        email,
        passwordHash: hashedPassword, // NOW PROPERLY HASHED!
        firstName,
        lastName,
        sex,
        phoneNumber,
        country: country || 'Nigeria',
        language: language || 'English',
        authProvider: AuthProvider.LOCAL,
        isTestAccount,
        isVerified: isTestAccount && TEST_SETTINGS.bypassEmailVerification,
        phoneNumberCaptured: !!phoneNumber,
      });

      // Add Google ID if it's a test account with Google OAuth
      if (isTestAccount && testAccountConfig?.googleId) {
        user.googleId = testAccountConfig.googleId;
      }

      await this.userRepository.save(user);

      // Create device if FCM token provided
      if (fcmToken) {
        await this.deviceService.updateOrCreateDevice(
          user.id,
          fcmToken,
          req,
          deviceInfo,
          TEST_SETTINGS.bypassDeviceVerification && isTestAccount,
        );
      }

      // Generate and send OTP (skip for test accounts if bypass is enabled)
      if (!isTestAccount || !TEST_SETTINGS.bypassOTPVerification) {
        const otpCode = await this.otpService.generateAndSaveOTP(
          user.id,
          OTPType.EMAIL_VERIFICATION,
          req.ip,
        );

        await this.userEmailService.sendWelcomeEmail(user.email, user.firstName, otpCode);

        logger.info('User registered successfully', { userId: user.id, email: user.email });

        return {
          success: true,
          message: 'Registration successful. Please check your email for verification code.',
          data: {
            userId: user.id,
            email: user.email,
            requiresVerification: true,
          },
        };
      }

      // For test accounts with bypass enabled
      logger.info('Test account registered with verification bypass', {
        userId: user.id,
        email: user.email,
      });

      return {
        success: true,
        message: 'Test account registered successfully',
        data: {
          userId: user.id,
          email: user.email,
          requiresVerification: false,
          isTestAccount: true,
        },
      };
    } catch (error) {
      console.error('=== REGISTRATION ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      if (error.code) {
        console.error('Database error code:', error.code);
      }
      if (error.detail) {
        console.error('Database error detail:', error.detail);
      }

      logger.error('Registration failed', {
        email: registerDto.email,
        error: error.message,
        errorCode: error.code,
      });

      throw error;
    }
  }
}
