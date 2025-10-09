// src/modules/admin/services/admin-password.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../entities/admin.entity';
import { AdminEmailService } from '@/modules/email/admin-email.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { logger } from '@/utils/logger.util';

const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 1;
const PASSWORD_HISTORY_LIMIT = 5;
const MIN_PASSWORD_LENGTH = 12;
const ALLOWED_EMAIL_DOMAIN = '@avigate.co';

@Injectable()
export class AdminPasswordService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    private adminEmailService: AdminEmailService,
  ) {}

  /**
   * Request Password Reset (Public endpoint)
   */
  async requestPasswordReset(email: string) {
    // Validate email domain
    if (!email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
      // Don't reveal if email exists or not
      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      };
    }

    // Find admin
    const admin = await this.adminRepository.findOne({
      where: { email: email.toLowerCase(), isActive: true },
    });

    if (!admin) {
      // Don't reveal if email exists or not (security best practice)
      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + PASSWORD_RESET_TOKEN_EXPIRY_HOURS);

    // Save token
    admin.resetToken = resetToken;
    admin.resetTokenExpiry = resetTokenExpiry;
    await this.adminRepository.save(admin);

    // Send email
    try {
      await this.adminEmailService.sendPasswordResetEmail(admin.email, admin.firstName, resetToken);
      logger.info(`Password reset requested for admin: ${admin.email}`);
    } catch (error) {
      logger.error(`Failed to send password reset email to ${admin.email}:`, error);
      // Don't throw error - we don't want to reveal if email was sent or not
    }

    return {
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    };
  }

  /**
   * Reset Password with Token (Public endpoint)
   */
  async resetPassword(token: string, newPassword: string, confirmPassword: string) {
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Validate password strength
    this.validatePasswordStrength(newPassword);

    // Find admin by reset token
    const admin = await this.adminRepository
      .createQueryBuilder('admin')
      .addSelect(['admin.passwordHash', 'admin.passwordHistory'])
      .where('admin.resetToken = :token', { token })
      .andWhere('admin.resetTokenExpiry > :now', { now: new Date() })
      .andWhere('admin.isActive = :isActive', { isActive: true })
      .getOne();

    if (!admin) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check password history
    await this.checkPasswordHistory(admin, newPassword);

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password history
    const passwordHistory = admin.passwordHistory || [];
    passwordHistory.unshift(passwordHash);
    if (passwordHistory.length > PASSWORD_HISTORY_LIMIT) {
      passwordHistory.pop();
    }

    // Update admin
    admin.passwordHash = passwordHash;
    admin.passwordHistory = passwordHistory;
    admin.passwordChangedAt = new Date();
    admin.resetToken = null;
    admin.resetTokenExpiry = null;
    admin.mustChangePassword = false;
    admin.failedLoginAttempts = 0;
    admin.lockedUntil = null;

    await this.adminRepository.save(admin);

    logger.info(`Password reset successfully for admin: ${admin.email}`);

    return {
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    };
  }

  /**
   * Change Password (Authenticated endpoint)
   */
  async changePassword(
    admin: Admin,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    // Validate password strength
    this.validatePasswordStrength(newPassword);

    // Get admin with password
    const adminWithPassword = await this.adminRepository
      .createQueryBuilder('admin')
      .addSelect(['admin.passwordHash', 'admin.passwordHistory'])
      .where('admin.id = :id', { id: admin.id })
      .getOne();

    if (!adminWithPassword) {
      throw new NotFoundException('Admin not found');
    }

    // Verify current password
    const isPasswordValid = await adminWithPassword.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, adminWithPassword.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException('New password cannot be the same as current password');
    }

    // Check password history
    await this.checkPasswordHistory(adminWithPassword, newPassword);

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password history
    const passwordHistory = adminWithPassword.passwordHistory || [];
    passwordHistory.unshift(passwordHash);
    if (passwordHistory.length > PASSWORD_HISTORY_LIMIT) {
      passwordHistory.pop();
    }

    // Update admin
    adminWithPassword.passwordHash = passwordHash;
    adminWithPassword.passwordHistory = passwordHistory;
    adminWithPassword.passwordChangedAt = new Date();
    adminWithPassword.mustChangePassword = false;

    await this.adminRepository.save(adminWithPassword);

    logger.info(`Password changed for admin: ${admin.email}`);

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  /**
   * Reset Admin Password (Admin management - by Super Admin)
   */
  async resetAdminPassword(adminId: string, sendEmail: boolean, currentAdmin: Admin) {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Generate temporary password
    const tempPassword = this.generateSecurePassword(16);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 24); // 24 hours for admin resets

    // Update admin
    admin.passwordHash = passwordHash;
    admin.mustChangePassword = true;
    admin.resetToken = resetToken;
    admin.resetTokenExpiry = resetTokenExpiry;
    admin.lastModifiedBy = currentAdmin.id;
    admin.failedLoginAttempts = 0;
    admin.lockedUntil = null;

    await this.adminRepository.save(admin);

    if (sendEmail) {
      try {
        await this.adminEmailService.sendPasswordResetEmail(
          admin.email,
          admin.firstName,
          resetToken,
        );
        logger.info(`Password reset email sent to admin: ${admin.email} by ${currentAdmin.email}`);
      } catch (error) {
        logger.error(`Failed to send password reset email to ${admin.email}:`, error);
        throw new BadRequestException('Failed to send password reset email');
      }
    }

    return {
      success: true,
      message: 'Password reset successfully',
      data: {
        tempPassword: sendEmail ? undefined : tempPassword,
        resetToken: sendEmail ? undefined : resetToken,
      },
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Validate Password Strength
   */
  private validatePasswordStrength(password: string): void {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
      );
    }

    // Check for uppercase
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter');
    }

    // Check for lowercase
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one lowercase letter');
    }

    // Check for number
    if (!/[0-9]/.test(password)) {
      throw new BadRequestException('Password must contain at least one number');
    }

    // Check for special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new BadRequestException('Password must contain at least one special character');
    }

    // Check for common patterns
    const commonPatterns = [
      /^(.)\1+$/, // All same character
      /^(012|123|234|345|456|567|678|789|890)+/, // Sequential numbers
      /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+/i, // Sequential letters
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        throw new BadRequestException('Password contains common patterns and is not secure');
      }
    }
  }

  /**
   * Check Password History
   */
  private async checkPasswordHistory(admin: Admin, newPassword: string): Promise<void> {
    const passwordHistory = admin.passwordHistory || [];

    for (const oldPasswordHash of passwordHistory) {
      const isReused = await bcrypt.compare(newPassword, oldPasswordHash);
      if (isReused) {
        throw new BadRequestException(
          `Password cannot be one of your last ${PASSWORD_HISTORY_LIMIT} passwords`,
        );
      }
    }
  }

  /**
   * Generate Secure Password
   */
  generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = uppercase + lowercase + numbers + special;

    let password = '';

    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Hash Password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
}
