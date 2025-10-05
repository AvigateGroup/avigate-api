// src/modules/admin/services/admin-password.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../entities/admin.entity';
import { AdminEmailService } from '@/modules/email/admin-email.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminPasswordService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    private adminEmailService: AdminEmailService,
  ) {}

  async resetAdminPassword(adminId: string, sendEmail: boolean, currentAdmin: Admin) {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const newPassword = this.generateSecurePassword(16);
    const passwordHash = await this.hashPassword(newPassword);

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);

    admin.passwordHash = passwordHash;
    admin.mustChangePassword = true;
    admin.resetToken = resetToken;
    admin.resetTokenExpiry = resetTokenExpiry;
    admin.lastModifiedBy = currentAdmin.id;

    await this.adminRepository.save(admin);

    if (sendEmail) {
      try {
        await this.adminEmailService.sendPasswordResetEmail(
          admin.email,
          admin.firstName,
          resetToken,
        );
      } catch (error) {
        console.error('Failed to send password reset email:', error);
      }
    }

    return {
      success: true,
      message: 'Password reset successfully',
      data: { tempPassword: sendEmail ? undefined : newPassword },
    };
  }

  generateSecurePassword(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
      password += chars[randomBytes[i] % chars.length];
    }

    return password;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}
