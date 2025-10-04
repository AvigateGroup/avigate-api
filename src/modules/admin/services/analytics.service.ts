// src/modules/admin/services/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { UserDevice } from '../../user/entities/user-device.entity';
import { UserOTP } from '../../user/entities/user-otp.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserDevice)
    private deviceRepository: Repository<UserDevice>,
    @InjectRepository(UserOTP)
    private otpRepository: Repository<UserOTP>,
  ) {}

  async getDashboardOverview(period: number) {
    const periodStart = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

    const totalUsers = await this.userRepository.count({ where: { isActive: true } });
    const newUsers = await this.userRepository.count({
      where: {
        createdAt: MoreThanOrEqual(periodStart),
        isActive: true,
      },
    });
    const verifiedUsers = await this.userRepository.count({
      where: { isVerified: true, isActive: true },
    });

    const totalDevices = await this.deviceRepository.count();
    const activeDevices = await this.deviceRepository.count({ where: { isActive: true } });

    return {
      success: true,
      data: {
        users: {
          total: totalUsers,
          new: newUsers,
          verified: verifiedUsers,
          verificationRate: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(2) : 0,
        },
        devices: {
          total: totalDevices,
          active: activeDevices,
        },
        period: `${period} days`,
      },
    };
  }

  async getUserGrowthMetrics(period: number, interval: string) {
    const periodStart = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

    // Get user registrations over time
    const registrations = await this.userRepository
      .createQueryBuilder('user')
      .select("DATE_TRUNC('day', user.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('user.createdAt >= :periodStart', { periodStart })
      .groupBy("DATE_TRUNC('day', user.createdAt)")
      .orderBy("DATE_TRUNC('day', user.createdAt)", 'ASC')
      .getRawMany();

    return {
      success: true,
      data: {
        registrationTrends: registrations,
        period: `${period} days`,
        interval,
      },
    };
  }
}
