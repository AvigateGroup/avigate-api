// src/modules/user/user.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserDevice } from './entities/user-device.entity';
import { UserOTP } from './entities/user-otp.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserEmailService } from '../email/user-email.service';
import { UserUpdatesEmailService } from '../email/user-updates-email.service';
import { UploadService } from '../upload/upload.service';
import { VerificationService } from '../auth/services/verification.service';
import { TEST_ACCOUNTS } from '@/config/test-accounts.config';
import { logger } from '@/utils/logger.util';
import {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
  needsLegalUpdate,
  needsTermsUpdate,
  needsPrivacyUpdate,
} from '@/common/constants/legal.constants';
import { AcceptLegalUpdateDto } from './dto/accept-legal-update.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserDevice)
    private deviceRepository: Repository<UserDevice>,
    @InjectRepository(UserOTP)
    private otpRepository: Repository<UserOTP>,
    private userEmailService: UserEmailService,
    private UserUpdatesEmailService: UserUpdatesEmailService,
    private uploadService: UploadService,
    private verificationService: VerificationService,
  ) {}

  async getProfile(user: User) {
    return {
      success: true,
      data: { user },
    };
  }

  async updateProfile(user: User, updateProfileDto: UpdateProfileDto) {
    const { firstName, lastName, email, sex, phoneNumber, country, language } = updateProfileDto;
    const updatedFields: string[] = [];
    const oldEmail = user.email;

    // Track email change
    let emailChanged = false;

    // Check phone number uniqueness
    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      const existingUser = await this.userRepository.findOne({
        where: { phoneNumber },
      });
      if (existingUser && existingUser.id !== user.id) {
        throw new ConflictException('Phone number is already in use');
      }
      user.phoneNumber = phoneNumber;
      user.phoneNumberCaptured = true;
      updatedFields.push('phoneNumber');
    }

    // Check email uniqueness
    if (email && email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email },
      });
      if (existingUser && existingUser.id !== user.id) {
        throw new ConflictException('Email is already in use');
      }
      user.email = email;
      user.isVerified = false; // Require re-verification
      emailChanged = true;
      updatedFields.push('email');
    }

    // Update other fields
    if (firstName && firstName !== user.firstName) {
      user.firstName = firstName;
      updatedFields.push('firstName');
    }

    if (lastName && lastName !== user.lastName) {
      user.lastName = lastName;
      updatedFields.push('lastName');
    }

    if (sex && sex !== user.sex) {
      user.sex = sex;
      updatedFields.push('sex');
    }

    if (country && country !== user.country) {
      user.country = country;
      updatedFields.push('country');
    }

    if (language && language !== user.language) {
      user.language = language;
      updatedFields.push('language');
    }

    await this.userRepository.save(user);

    // Send email notifications if fields were updated
    if (updatedFields.length > 0) {
      if (emailChanged && email) {
        try {
          // Send notification to old email
          await this.UserUpdatesEmailService.sendEmailChangeNotificationToOldEmail(
            oldEmail,
            email,
            firstName || user.firstName,
          );

          // Generate and send verification OTP to new email
          await this.verificationService.generateAndSendVerificationOtp(user, true);

          logger.info('Email verification OTP sent after email change', {
            userId: user.id,
            oldEmail,
            newEmail: email,
          });
        } catch (error) {
          logger.error('Failed to send email change notifications', {
            userId: user.id,
            error: error.message,
          });
          // Don't throw error - profile was already updated
          // User can use resend verification if needed
        }
      } else if (updatedFields.length > 0) {
        try {
          // Send general profile update notification
          await this.UserUpdatesEmailService.sendProfileUpdateNotification(
            user.email,
            user.firstName,
            updatedFields,
          );
        } catch (error) {
          logger.error('Failed to send profile update notification', {
            userId: user.id,
            error: error.message,
          });
          // Don't throw error - profile was already updated
        }
      }
    }

    logger.info('Profile updated successfully', { userId: user.id, updatedFields });

    return {
      success: true,
      message: emailChanged
        ? 'Profile updated successfully. A verification code has been sent to your new email address.'
        : 'Profile updated successfully',
      data: { user },
    };
  }

  async uploadProfilePicture(user: User, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Delete old profile picture if exists
    if (user.profilePicture) {
      try {
        await this.uploadService.deleteFile(user.profilePicture);
      } catch (error) {
        logger.warn('Failed to delete old profile picture', { error: error.message });
      }
    }

    // Upload new profile picture
    const fileUrl = await this.uploadService.uploadFile(file, 'profile-pictures');

    user.profilePicture = fileUrl;
    await this.userRepository.save(user);

    // Send notification
    await this.UserUpdatesEmailService.sendProfileUpdateNotification(user.email, user.firstName, [
      'profilePicture',
    ]);

    logger.info('Profile picture uploaded successfully', { userId: user.id, fileUrl });

    return {
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        profilePicture: fileUrl,
      },
    };
  }

  async getUserDevices(user: User) {
    const devices = await this.deviceRepository.find({
      where: { userId: user.id },
      order: { lastActiveAt: 'DESC' },
    });

    return {
      success: true,
      data: { devices },
    };
  }

  async deactivateDevice(user: User, deviceId: string) {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId, userId: user.id },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    device.isActive = false;
    await this.deviceRepository.save(device);

    return {
      success: true,
      message: 'Device deactivated successfully',
    };
  }

  async getUserStats(user: User) {
    const totalDevices = await this.deviceRepository.count({
      where: { userId: user.id },
    });

    const activeDevices = await this.deviceRepository.count({
      where: { userId: user.id, isActive: true },
    });

    const totalOTPs = await this.otpRepository.count({
      where: { userId: user.id },
    });

    const usedOTPs = await this.otpRepository.count({
      where: { userId: user.id, isUsed: true },
    });

    return {
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        isVerified: user.isVerified,
        isTestAccount: user.isTestAccount,
        memberSince: user.createdAt,
        lastLogin: user.lastLoginAt,
        reputationScore: user.reputationScore,
        totalContributions: user.totalContributions,
        totalDevices,
        activeDevices,
        totalOTPs,
        usedOTPs,
      },
    };
  }

  async deleteAccount(user: User, confirmDelete: string) {
    if (confirmDelete !== 'DELETE_MY_ACCOUNT') {
      throw new BadRequestException(
        'Please confirm account deletion by sending "DELETE_MY_ACCOUNT"',
      );
    }

    const userEmail = user.email;
    const userFirstName = user.firstName;
    const isTestAccount =
      user.isTestAccount || TEST_ACCOUNTS.hasOwnProperty(user.email.toLowerCase());

    // Delete profile picture if exists
    if (user.profilePicture) {
      try {
        await this.uploadService.deleteFile(user.profilePicture);
      } catch (error) {
        logger.warn('Failed to delete profile picture', { error: error.message });
      }
    }

    // Delete related data
    await this.deviceRepository.delete({ userId: user.id });
    await this.otpRepository.delete({ userId: user.id });

    // Delete user
    await this.userRepository.remove(user);

    // Send confirmation email
    if (!isTestAccount) {
      await this.userEmailService.sendAccountDeletionConfirmation(
        userEmail,
        userFirstName,
        new Date().toLocaleString(),
      );
    }

    logger.info('Account deleted successfully', { email: userEmail });

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  }

  /**
   * Check if user needs to accept updated legal documents
   */
  async checkLegalStatus(user: User) {
    const needsUpdate = needsLegalUpdate(user.termsVersion, user.privacyVersion);

    return {
      success: true,
      data: {
        needsUpdate,
        needsTermsUpdate: needsTermsUpdate(user.termsVersion),
        needsPrivacyUpdate: needsPrivacyUpdate(user.privacyVersion),
        currentTermsVersion: CURRENT_TERMS_VERSION,
        currentPrivacyVersion: CURRENT_PRIVACY_VERSION,
        userTermsVersion: user.termsVersion,
        userPrivacyVersion: user.privacyVersion,
        termsAcceptedAt: user.termsAcceptedAt,
        privacyAcceptedAt: user.privacyAcceptedAt,
      },
    };
  }

  /**
   * Record user's acceptance of updated legal documents
   */
  async acceptLegalUpdate(user: User, acceptLegalDto: AcceptLegalUpdateDto) {
    const { acceptTerms, acceptPrivacy } = acceptLegalDto;
    const updates: Partial<User> = {};

    if (acceptTerms && needsTermsUpdate(user.termsVersion)) {
      updates.termsVersion = CURRENT_TERMS_VERSION;
      updates.termsAcceptedAt = new Date();
      logger.info('User accepted updated Terms of Service', {
        userId: user.id,
        oldVersion: user.termsVersion,
        newVersion: CURRENT_TERMS_VERSION,
      });
    }

    if (acceptPrivacy && needsPrivacyUpdate(user.privacyVersion)) {
      updates.privacyVersion = CURRENT_PRIVACY_VERSION;
      updates.privacyAcceptedAt = new Date();
      logger.info('User accepted updated Privacy Policy', {
        userId: user.id,
        oldVersion: user.privacyVersion,
        newVersion: CURRENT_PRIVACY_VERSION,
      });
    }

    if (Object.keys(updates).length === 0) {
      return {
        success: true,
        message: 'No updates needed - you are already on the latest versions',
        data: {
          termsVersion: user.termsVersion,
          privacyVersion: user.privacyVersion,
        },
      };
    }

    await this.userRepository.update(user.id, updates);

    const updatedUser = await this.userRepository.findOne({ where: { id: user.id } });

    if (!updatedUser) {
      throw new Error('Failed to retrieve updated user');
    }

    return {
      success: true,
      message: 'Legal documents acceptance recorded successfully',
      data: {
        termsVersion: updatedUser.termsVersion,
        privacyVersion: updatedUser.privacyVersion,
        termsAcceptedAt: updatedUser.termsAcceptedAt,
        privacyAcceptedAt: updatedUser.privacyAcceptedAt,
      },
    };
  }
}
