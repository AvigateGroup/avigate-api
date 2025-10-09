// src/modules/admin/services/admin-totp.service.ts
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../entities/admin.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { logger } from '@/utils/logger.util';

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;

@Injectable()
export class AdminTotpService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
  ) {}

  /**
   * Generate TOTP Secret (Step 1 of 2FA setup)
   */
  async generateSecret(admin: Admin) {
    // Check if TOTP is already enabled
    const adminWithTotp = await this.adminRepository
      .createQueryBuilder('admin')
      .addSelect(['admin.totpSecret', 'admin.totpEnabled'])
      .where('admin.id = :id', { id: admin.id })
      .getOne();

    if (!adminWithTotp) {
      throw new NotFoundException('Admin not found');
    }

    if (adminWithTotp.totpEnabled) {
      throw new BadRequestException('TOTP is already enabled. Disable it first to regenerate.');
    }

    // Generate new secret
    const secret = speakeasy.generateSecret({
      name: `Avigate Admin (${admin.email})`,
      issuer: 'Avigate',
      length: 32,
    });

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(backupCodes.map(code => bcrypt.hash(code, 10)));

    // Save secret (but don't enable yet)
    adminWithTotp.totpSecret = secret.base32;
    adminWithTotp.totpBackupCodes = hashedBackupCodes;
    await this.adminRepository.save(adminWithTotp);

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

    logger.info(`TOTP secret generated for admin: ${admin.email}`);

    return {
      success: true,
      message:
        'TOTP secret generated. Scan the QR code with your authenticator app and verify with a token to enable 2FA.',
      data: {
        secret: secret.base32,
        qrCode: qrCodeDataUrl,
        backupCodes, // Show these ONCE to the user - they should save them securely
        manualEntryKey: secret.base32,
      },
    };
  }

  /**
   * Enable TOTP (Step 2 of 2FA setup - verify token)
   */
  async enableTotp(admin: Admin, totpToken: string) {
    if (!totpToken || totpToken.length !== 6) {
      throw new BadRequestException('Invalid TOTP token format');
    }

    // Get admin with TOTP secret
    const adminWithTotp = await this.adminRepository
      .createQueryBuilder('admin')
      .addSelect(['admin.totpSecret', 'admin.totpEnabled'])
      .where('admin.id = :id', { id: admin.id })
      .getOne();

    if (!adminWithTotp) {
      throw new NotFoundException('Admin not found');
    }

    if (adminWithTotp.totpEnabled) {
      throw new BadRequestException('TOTP is already enabled');
    }

    if (!adminWithTotp.totpSecret) {
      throw new BadRequestException('TOTP secret not found. Please generate a secret first.');
    }

    // Verify the token
    const isValid = speakeasy.totp.verify({
      secret: adminWithTotp.totpSecret,
      encoding: 'base32',
      token: totpToken.trim(),
      window: 2, // Allow 2 time steps before and after
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid TOTP token. Please check your authenticator app.');
    }

    // Enable TOTP
    adminWithTotp.totpEnabled = true;
    await this.adminRepository.save(adminWithTotp);

    logger.info(`TOTP enabled for admin: ${admin.email}`);

    return {
      success: true,
      message: 'Two-factor authentication enabled successfully',
    };
  }

  /**
   * Disable TOTP
   */
  async disableTotp(admin: Admin, currentPassword: string, totpToken: string) {
    // Get admin with password and TOTP
    const adminWithCredentials = await this.adminRepository
      .createQueryBuilder('admin')
      .addSelect(['admin.passwordHash', 'admin.totpSecret', 'admin.totpBackupCodes'])
      .where('admin.id = :id', { id: admin.id })
      .getOne();

    if (!adminWithCredentials) {
      throw new NotFoundException('Admin not found');
    }

    if (!adminWithCredentials.totpEnabled) {
      throw new BadRequestException('TOTP is not enabled');
    }

    // Verify password
    const isPasswordValid = await adminWithCredentials.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Verify TOTP token
    if (!totpToken || totpToken.length !== 6) {
      throw new BadRequestException('Invalid TOTP token format');
    }

    const isTotpValid = adminWithCredentials.verifyTOTP(totpToken.trim());
    if (!isTotpValid) {
      throw new UnauthorizedException('Invalid TOTP token');
    }

    // Disable TOTP
    adminWithCredentials.totpEnabled = false;
    adminWithCredentials.totpSecret = null;
    adminWithCredentials.totpBackupCodes = null;
    await this.adminRepository.save(adminWithCredentials);

    logger.info(`TOTP disabled for admin: ${admin.email}`);

    return {
      success: true,
      message: 'Two-factor authentication disabled successfully',
    };
  }

  /**
   * Get TOTP Status
   */
  async getTotpStatus(admin: Admin) {
    const adminWithTotp = await this.adminRepository
      .createQueryBuilder('admin')
      .addSelect('admin.totpBackupCodes')
      .where('admin.id = :id', { id: admin.id })
      .getOne();

    if (!adminWithTotp) {
      throw new NotFoundException('Admin not found');
    }

    const backupCodesRemaining = adminWithTotp.totpBackupCodes?.length || 0;

    return {
      success: true,
      data: {
        totpEnabled: adminWithTotp.totpEnabled,
        backupCodesRemaining,
      },
    };
  }

  /**
   * Regenerate Backup Codes
   */
  async regenerateBackupCodes(admin: Admin, currentPassword: string, totpToken: string) {
    // Get admin with password and TOTP
    const adminWithCredentials = await this.adminRepository
      .createQueryBuilder('admin')
      .addSelect(['admin.passwordHash', 'admin.totpSecret'])
      .where('admin.id = :id', { id: admin.id })
      .getOne();

    if (!adminWithCredentials) {
      throw new NotFoundException('Admin not found');
    }

    if (!adminWithCredentials.totpEnabled) {
      throw new BadRequestException('TOTP is not enabled');
    }

    // Verify password
    const isPasswordValid = await adminWithCredentials.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Verify TOTP token
    if (!totpToken || totpToken.length !== 6) {
      throw new BadRequestException('Invalid TOTP token format');
    }

    const isTotpValid = adminWithCredentials.verifyTOTP(totpToken.trim());
    if (!isTotpValid) {
      throw new UnauthorizedException('Invalid TOTP token');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(backupCodes.map(code => bcrypt.hash(code, 10)));

    adminWithCredentials.totpBackupCodes = hashedBackupCodes;
    await this.adminRepository.save(adminWithCredentials);

    logger.info(`Backup codes regenerated for admin: ${admin.email}`);

    return {
      success: true,
      message: 'Backup codes regenerated successfully. Save them securely.',
      data: {
        backupCodes,
      },
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Generate Backup Codes
   */
  private generateBackupCodes(count: number = BACKUP_CODE_COUNT): string[] {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      // Generate random alphanumeric code
      const code = crypto
        .randomBytes(Math.ceil(BACKUP_CODE_LENGTH / 2))
        .toString('hex')
        .substring(0, BACKUP_CODE_LENGTH)
        .toUpperCase();

      codes.push(code);
    }

    return codes;
  }
}
