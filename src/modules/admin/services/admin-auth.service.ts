// src/modules/admin/services/admin-auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../entities/admin.entity';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { Request } from 'express';
import { logger } from '@/utils/logger.util';

const ALLOWED_EMAIL_DOMAIN = '@avigate.co';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: AdminLoginDto, req: Request) {
    const { email, password, totpToken, backupCode } = loginDto;

    // Validate email domain
    if (!email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
      throw new UnauthorizedException('Access restricted to authorized domains');
    }

    // Find admin
    const admin = await this.adminRepository
      .createQueryBuilder('admin')
      .addSelect('admin.passwordHash')
      .where('admin.email = :email', { email })
      .getOne();

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if locked
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is temporarily locked');
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      await this.incrementFailedAttempts(admin);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check TOTP
    if (admin.totpEnabled) {
      let totpValid = false;

      if (totpToken) {
        totpValid = admin.verifyTOTP(totpToken);
      } else if (backupCode) {
        // Implement backup code verification
        totpValid = false; // Placeholder
      }

      if (!totpValid) {
        throw new UnauthorizedException('Invalid TOTP token or backup code');
      }
    }

    // Generate tokens
    const tokens = this.generateTokens(admin);

    // Update login info
    admin.lastLoginAt = new Date();
    admin.lastLoginIP = req.ip;
    admin.lastUserAgent = req.get('User-Agent');
    admin.failedLoginAttempts = 0;
    admin.lockedUntil = null;
    admin.refreshToken = tokens.refreshToken;
    admin.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.adminRepository.save(admin);

    logger.info(`Admin logged in: ${email}`);

    return {
      success: true,
      message: 'Login successful',
      data: {
        admin,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  async logout(admin: Admin) {
    admin.refreshToken = null;
    admin.refreshTokenExpiresAt = null;
    await this.adminRepository.save(admin);

    logger.info(`Admin logged out: ${admin.email}`);

    return {
      success: true,
      message: 'Logout successful',
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('ADMIN_REFRESH_SECRET'),
      });

      const admin = await this.adminRepository.findOne({
        where: { id: payload.adminId, isActive: true },
      });

      if (!admin || admin.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (admin.refreshTokenExpiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      const tokens = this.generateTokens(admin);

      admin.refreshToken = tokens.refreshToken;
      admin.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await this.adminRepository.save(admin);

      return {
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private generateTokens(admin: Admin) {
    const payload = { adminId: admin.id, email: admin.email, role: admin.role };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.configService.get('ADMIN_REFRESH_SECRET'),
        expiresIn: this.configService.get('ADMIN_REFRESH_EXPIRATION', '7d'),
      }),
    };
  }

  private async incrementFailedAttempts(admin: Admin) {
    admin.failedLoginAttempts += 1;

    let lockDuration = 30 * 60 * 1000; // 30 minutes

    if (admin.failedLoginAttempts >= 15) {
      lockDuration = 24 * 60 * 60 * 1000; // 24 hours
    } else if (admin.failedLoginAttempts >= 10) {
      lockDuration = 2 * 60 * 60 * 1000; // 2 hours
    }

    if (admin.failedLoginAttempts >= 5) {
      admin.lockedUntil = new Date(Date.now() + lockDuration);
    }

    await this.adminRepository.save(admin);
  }
}