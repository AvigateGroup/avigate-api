// src/modules/admin/services/admin-invitation.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../entities/admin.entity';
import { AcceptInvitationDto } from '../dto/accept-invitation.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { logger } from '@/utils/logger.util';

const MIN_PASSWORD_LENGTH = 12;

@Injectable()
export class AdminInvitationService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
  ) {}

  /**
   * Accept Admin Invitation (Public endpoint)
   */
  async acceptInvitation(acceptInvitationDto: AcceptInvitationDto) {
    const { token, newPassword, confirmPassword } = acceptInvitationDto;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Validate password strength
    this.validatePasswordStrength(newPassword);

    // Find admin by invitation token
    const admin = await this.adminRepository
      .createQueryBuilder('admin')
      .addSelect('admin.inviteToken')
      .where('admin.inviteToken = :token', { token })
      .andWhere('admin.inviteTokenExpiry > :now', { now: new Date() })
      .getOne();

    if (!admin) {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    // Check if invitation already accepted
    if (!admin.mustChangePassword && admin.passwordChangedAt) {
      throw new BadRequestException('Invitation has already been accepted');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update admin
    admin.passwordHash = passwordHash;
    admin.passwordChangedAt = new Date();
    admin.mustChangePassword = false;
    admin.inviteToken = null;
    admin.inviteTokenExpiry = null;
    admin.isActive = true;

    // Initialize password history
    admin.passwordHistory = [passwordHash];

    await this.adminRepository.save(admin);

    logger.info(`Admin invitation accepted: ${admin.email}`);

    return {
      success: true,
      message: 'Invitation accepted successfully. You can now log in with your new password.',
      data: {
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
      },
    };
  }

  /**
   * Resend Invitation (Super Admin only)
   */
  async resendInvitation(adminId: string, currentAdmin: Admin) {
    const admin = await this.adminRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Check if admin has already accepted invitation
    if (!admin.mustChangePassword && admin.passwordChangedAt) {
      throw new BadRequestException('Admin has already accepted the invitation');
    }

    // Generate new invitation token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiry = new Date();
    inviteTokenExpiry.setDate(inviteTokenExpiry.getDate() + 7); // 7 days

    admin.inviteToken = inviteToken;
    admin.inviteTokenExpiry = inviteTokenExpiry;
    admin.lastModifiedBy = currentAdmin.id;

    await this.adminRepository.save(admin);

    // Note: Email sending would be handled by the calling service
    logger.info(`Invitation resent for admin: ${admin.email} by ${currentAdmin.email}`);

    return {
      success: true,
      message: 'Invitation resent successfully',
      data: {
        inviteToken,
        email: admin.email,
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
  }
}
