// FILE 5: src/modules/auth/services/token.service.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { UserDevice } from '../../user/entities/user-device.entity';

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserDevice)
    private deviceRepository: Repository<UserDevice>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  generateTokens(user: User) {
    const payload = { userId: user.id, email: user.email };
    
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
      }),
    };
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.findUserWithRefreshToken(payload.userId, refreshToken);

      const tokens = this.generateTokens(user);
      await this.updateUserRefreshToken(user, tokens.refreshToken);

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
    await this.clearUserRefreshToken(user.id);

    if (fcmToken) {
      await this.deactivateDevice(user.id, fcmToken);
    }

    return {
      success: true,
      message: 'Logout successful',
    };
  }

  private async findUserWithRefreshToken(userId: string, refreshToken: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'refreshToken', 'refreshTokenExpiresAt', 'isActive'],
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    return user;
  }

  private async updateUserRefreshToken(user: User, refreshToken: string) {
    user.refreshToken = refreshToken;
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.userRepository.save(user);
  }

  private async clearUserRefreshToken(userId: string) {
    await this.userRepository.update(
      { id: userId },
      { 
        refreshToken: null,
        refreshTokenExpiresAt: null,
      }
    );
  }

  private async deactivateDevice(userId: string, fcmToken: string) {
    await this.deviceRepository.update(
      { 
        userId,
        fcmToken,
      },
      { isActive: false }
    );
  }
}
