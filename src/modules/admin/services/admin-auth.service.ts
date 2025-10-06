// src/modules/admin/services/admin-auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../entities/admin.entity';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';
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
        .addSelect(['admin.passwordHash', 'admin.totpSecret', 'admin.totpBackupCodes'])  // <-- Add totpBackupCodes here
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
        } else if (backupCode && admin.totpBackupCodes) {
        // Verify backup code
        for (const hashedCode of admin.totpBackupCodes) {
            if (await bcrypt.compare(backupCode, hashedCode)) {
            totpValid = true;
            // Remove used backup code
            admin.totpBackupCodes = admin.totpBackupCodes.filter(
                code => code !== hashedCode
            );
            await this.adminRepository.save(admin);
            break;
            }
        }
        }

        if (!totpValid) {
        throw new UnauthorizedException('Invalid TOTP token or backup code');
        }
    }

    // Generate tokens
    const tokens = this.generateTokens(admin);

    // Update login info
    admin.lastLoginAt = new Date();
    admin.lastLoginIP = req.ip ?? '';
    admin.lastUserAgent = req.get('User-Agent') ?? '';
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
    admin.refreshToken = '';
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

      if (!admin.refreshTokenExpiresAt || admin.refreshTokenExpiresAt < new Date()) {
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

async setupTOTP(admin: Admin) {
  const adminWithSecret = await this.adminRepository
    .createQueryBuilder('admin')
    .addSelect('admin.totpSecret')
    .where('admin.id = :id', { id: admin.id })
    .getOne();

  // ADD THIS NULL CHECK
  if (!adminWithSecret) {
    throw new UnauthorizedException('Admin not found');
  }

  const secret = adminWithSecret.generateTOTPSecret();
  
  // Generate backup codes
  const backupCodes = this.generateBackupCodes();
  const hashedBackupCodes = await Promise.all(
    backupCodes.map(code => bcrypt.hash(code, 10))
  );

  adminWithSecret.totpBackupCodes = hashedBackupCodes;
  await this.adminRepository.save(adminWithSecret);

  return {
    success: true,
    message: 'TOTP secret generated. Scan QR code with your authenticator app.',
    data: {
      secret: secret.base32,
      qrCode: secret.otpauth_url,
      backupCodes, // Show these ONCE to the user
    },
  };
}

async verifyAndEnableTOTP(admin: Admin, totpToken: string) {
  const adminWithSecret = await this.adminRepository
    .createQueryBuilder('admin')
    .addSelect('admin.totpSecret')
    .where('admin.id = :id', { id: admin.id })
    .getOne();

  // ADD THIS NULL CHECK
  if (!adminWithSecret) {
    throw new UnauthorizedException('Admin not found');
  }

  if (!adminWithSecret.totpSecret) {
    throw new UnauthorizedException('TOTP not set up. Call /totp/setup first.');
  }

  const isValid = adminWithSecret.verifyTOTP(totpToken);
  
  if (!isValid) {
    throw new UnauthorizedException('Invalid TOTP token');
  }

  adminWithSecret.totpEnabled = true;
  await this.adminRepository.save(adminWithSecret);

  logger.info(`TOTP enabled for admin: ${admin.email}`);

  return {
    success: true,
    message: 'TOTP 2FA enabled successfully',
  };
}

async disableTOTP(admin: Admin, password: string) {
  const adminWithSecret = await this.adminRepository
    .createQueryBuilder('admin')
    .addSelect(['admin.passwordHash', 'admin.totpSecret', 'admin.totpBackupCodes'])
    .where('admin.id = :id', { id: admin.id })
    .getOne();

  // ADD THIS NULL CHECK
  if (!adminWithSecret) {
    throw new UnauthorizedException('Admin not found');
  }

  const isPasswordValid = await adminWithSecret.comparePassword(password);
  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid password');
  }

  adminWithSecret.totpEnabled = false;
  adminWithSecret.totpSecret = null;
  adminWithSecret.totpBackupCodes = null;
  await this.adminRepository.save(adminWithSecret);

  logger.info(`TOTP disabled for admin: ${admin.email}`);

  return {
    success: true,
    message: 'TOTP 2FA disabled',
  };
}

async regenerateBackupCodes(admin: Admin) {
  const backupCodes = this.generateBackupCodes();
  const hashedBackupCodes = await Promise.all(
    backupCodes.map(code => bcrypt.hash(code, 10))
  );

  admin.totpBackupCodes = hashedBackupCodes;
  await this.adminRepository.save(admin);

  return {
    success: true,
    message: 'Backup codes regenerated',
    data: { backupCodes },
  };
}

private generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );
  }
  return codes;
}
}
