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
import { TEST_ACCOUNTS } from '@/config/test-accounts.config';

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
  ) {}

  async getProfile(user: User) {
    return {
      success: true,
      data: { user },
    };
  }

  async updateProfile(user: User, updateProfileDto: UpdateProfileDto) {
    const { firstName, lastName, sex, phoneNumber, profilePicture } = updateProfileDto;

    // Check phone number uniqueness
    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      const existingUser = await this.userRepository.findOne({
        where: { phoneNumber },
      });
      if (existingUser && existingUser.id !== user.id) {
        throw new ConflictException('Phone number is already in use');
      }
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (sex) user.sex = sex;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (profilePicture) user.profilePicture = profilePicture;

    await this.userRepository.save(user);

    return {
      success: true,
      message: 'Profile updated successfully',
      data: { user },
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

    // Skip password check for test accounts
    const isTestAccount =
      user.isTestAccount || TEST_ACCOUNTS.hasOwnProperty(user.email.toLowerCase());

    if (!isTestAccount) {
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

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  }
}
