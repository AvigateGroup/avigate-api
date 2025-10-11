// src/modules/admin/services/admin-invitation.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../entities/admin.entity';
import { AcceptInvitationDto } from '../dto/accept-invitation.dto';
import * as bcrypt from 'bcrypt';
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
   * This is where the admin sets their FIRST and ONLY real password
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
      .addSelect(['admin.inviteToken', 'admin.passwordHash'])
      .where('admin.inviteToken = :token', { token })
      .andWhere('admin.inviteTokenExpiry > :now', { now: new Date() })
      .getOne();

    if (!admin) {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    // Hash the new password - THIS IS THE FIRST REAL PASSWORD
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update admin - activate account and set password
    admin.passwordHash = passwordHash;
    admin.passwordChangedAt = new Date();
    admin.mustChangePassword = false;
    admin.inviteToken = null;
    admin.inviteTokenExpiry = null;
    admin.isActive = true; // Activate account now
    admin.passwordHistory = [passwordHash]; // Initialize password history

    await this.adminRepository.save(admin);

    logger.info(`Admin invitation accepted and account activated: ${admin.email}`);

    return {
      success: true,
      message: 'Invitation accepted successfully. You can now log in with your password.',
      data: {
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
      },
    };
  }

  /**
   * Validate Password Strength
   */
  private validatePasswordStrength(password: string): void {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
      );
    }

    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      throw new BadRequestException('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new BadRequestException('Password must contain at least one special character');
    }
  }
}
