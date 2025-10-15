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
import { TEST_ACCOUNTS } from '@/config/test-accounts.config';
import { logger } from '@/utils/logger.util';

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
  ) {}

  async getProfile(user: User) {
    return {
      success: true,
      data: { user },
    };
  }

  async updateProfile(user: User, updateProfileDto: UpdateProfileDto) {
    const { firstName, lastName, email, sex, phoneNumber, country, language, profilePicture } =
      updateProfileDto;
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

    if (profilePicture && profilePicture !== user.profilePicture) {
      user.profilePicture = profilePicture;
      updatedFields.push('profilePicture');
    }

    await this.userRepository.save(user);

    // Send email notifications if fields were updated
    if (updatedFields.length > 0) {
      if (emailChanged && email) {
        // Add email check here
        // Send to old email
        await this.UserUpdatesEmailService.sendEmailChangeNotificationToOldEmail(
          oldEmail,
          email, // TypeScript now knows email is string, not undefined
          firstName || user.firstName,
        );

        // Send to new email
        await this.UserUpdatesEmailService.sendEmailChangeConfirmationToNewEmail(
          email, // TypeScript now knows email is string, not undefined
          oldEmail,
          firstName || user.firstName,
        );
      } else if (updatedFields.length > 0) {
        // Send general profile update notification
        await this.UserUpdatesEmailService.sendProfileUpdateNotification(
          user.email,
          user.firstName,
          updatedFields,
        );
      }
    }

    logger.info('Profile updated successfully', { userId: user.id, updatedFields });

    return {
      success: true,
      message: emailChanged
        ? 'Profile updated successfully. Please verify your new email address.'
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

  async deleteAccount(user: User, password: string, confirmDelete: string) {
    if (confirmDelete !== 'DELETE_MY_ACCOUNT') {
      throw new BadRequestException(
        'Please confirm account deletion by sending "DELETE_MY_ACCOUNT"',
      );
    }

    // Skip password check for test accounts and Google users without password
    const isTestAccount =
      user.isTestAccount || TEST_ACCOUNTS.hasOwnProperty(user.email.toLowerCase());

    if (!isTestAccount && user.passwordHash) {
      // Fetch user with password hash for verification
      const userWithPassword = await this.userRepository.findOne({
        where: { id: user.id },
        select: ['id', 'email', 'firstName', 'passwordHash', 'isTestAccount'],
      });

      if (!userWithPassword || !userWithPassword.passwordHash) {
        throw new BadRequestException('Unable to verify password');
      }

      const isPasswordValid = await userWithPassword.comparePassword(password);
      if (!isPasswordValid) {
        throw new BadRequestException('Password is incorrect');
      }
    }

    const userEmail = user.email;
    const userFirstName = user.firstName;

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
}
