// src/modules/admin/controllers/user-management.controller.ts
import { Controller, Get, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '@/common/guards/admin-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { CurrentAdmin } from '@/common/decorators/current-admin.decorator';
import { Admin } from '../entities/admin.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { UserDevice } from '../../user/entities/user-device.entity';
import { UserOTP } from '../../user/entities/user-otp.entity';

@ApiTags('admin')
@Controller('admin/users')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UserManagementController {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserDevice)
    private deviceRepository: Repository<UserDevice>,
    @InjectRepository(UserOTP)
    private otpRepository: Repository<UserOTP>,
  ) {}

  @Get()
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Get all users with filters' })
  async getAllUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('isVerified') isVerified?: string,
    @Query('isActive') isActive?: string,
    @Query('sortBy') sortBy = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const offset = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.firstName = Like(`%${search}%`);
    }
    if (isVerified !== undefined) {
      where.isVerified = isVerified === 'true';
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [users, total] = await this.userRepository.findAndCount({
      where,
      take: Number(limit),
      skip: offset,
      order: { [sortBy]: sortOrder.toUpperCase() },
    });

    return {
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    };
  }

  @Get(':userId')
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Get user details' })
  async getUserDetails(@Param('userId') userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['devices'],
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const stats = {
      totalDevices: await this.deviceRepository.count({ where: { userId } }),
      activeDevices: await this.deviceRepository.count({
        where: { userId, isActive: true },
      }),
      totalOTPs: await this.otpRepository.count({ where: { userId } }),
    };

    return {
      success: true,
      data: { user, stats },
    };
  }

  @Put(':userId/status')
  @RequirePermissions('users.edit')
  @ApiOperation({ summary: 'Update user status' })
  async updateUserStatus(
    @Param('userId') userId: string,
    @Body('isVerified') isVerified?: boolean,
    @Body('isActive') isActive?: boolean,
    @Body('reason') reason?: string,
    @CurrentAdmin() admin?: Admin,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (isVerified !== undefined) user.isVerified = isVerified;
    if (isActive !== undefined) user.isActive = isActive;

    await this.userRepository.save(user);

    return {
      success: true,
      message: 'User status updated successfully',
      data: { user },
    };
  }

  @Delete(':userId')
  @RequirePermissions('users.delete')
  @ApiOperation({ summary: 'Delete user account' })
  async deleteUserAccount(@Param('userId') userId: string, @Body('reason') reason: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    await this.deviceRepository.delete({ userId });
    await this.otpRepository.delete({ userId });
    await this.userRepository.remove(user);

    return {
      success: true,
      message: 'User account deleted successfully',
    };
  }

  @Get('stats/overview')
  @RequirePermissions('analytics.view')
  @ApiOperation({ summary: 'Get user statistics' })
  async getUserStats() {
    const totalUsers = await this.userRepository.count();
    const verifiedUsers = await this.userRepository.count({ where: { isVerified: true } });
    const activeUsers = await this.userRepository.count({ where: { isActive: true } });
    const googleUsers = await this.userRepository.count({ where: { googleId: Like('%') } });

    return {
      success: true,
      data: {
        totalUsers,
        verifiedUsers,
        activeUsers,
        googleUsers,
        verificationRate: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(2) : 0,
        googleSignupRate: totalUsers > 0 ? ((googleUsers / totalUsers) * 100).toFixed(2) : 0,
      },
    };
  }
}
