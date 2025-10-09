// src/modules/admin/services/admin-auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../entities/admin.entity';
import { AdminSession } from '../entities/admin-session.entity';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { logger } from '@/utils/logger.util';

const ALLOWED_EMAIL_DOMAIN = '@avigate.co';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  sessionId: string;
}

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    @InjectRepository(AdminSession)
    private sessionRepository: Repository<AdminSession>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Admin Login with TOTP/Backup Code Support
   */
  async login(loginDto: AdminLoginDto, req: Request, res: Response) {
    const { email, password, totpToken, backupCode } = loginDto;

    // Validate email domain
    if (!email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
      throw new UnauthorizedException('Access restricted to authorized domains');
    }

    // Find admin with sensitive fields
    const admin = await this.adminRepository
      .createQueryBuilder('admin')
      .addSelect(['admin.passwordHash', 'admin.totpSecret', 'admin.totpBackupCodes'])
      .where('admin.email = :email', { email: email.toLowerCase() })
      .andWhere('admin.deletedAt IS NULL')
      .getOne();

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is active
    if (!admin.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Check if account is locked
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((admin.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Account is temporarily locked. Please try again in ${remainingMinutes} minutes.`,
      );
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      await this.incrementFailedAttempts(admin);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check TOTP if enabled
    if (admin.totpEnabled) {
      let totpValid = false;

      // Verify TOTP token
      if (totpToken) {
        totpValid = admin.verifyTOTP(totpToken);
      }
      // Verify backup code
      else if (backupCode && admin.totpBackupCodes && admin.totpBackupCodes.length > 0) {
        for (const hashedCode of admin.totpBackupCodes) {
          if (await bcrypt.compare(backupCode.trim().toUpperCase(), hashedCode)) {
            totpValid = true;
            // Remove used backup code
            admin.totpBackupCodes = admin.totpBackupCodes.filter(code => code !== hashedCode);
            await this.adminRepository.save(admin);
            logger.info(`Backup code used for admin: ${email}`);
            break;
          }
        }
      }

      if (!totpValid) {
        throw new UnauthorizedException(
          'Two-factor authentication required. Please provide a valid TOTP token or backup code.',
        );
      }
    }

    // Create session
    const session = await this.createSession(admin, req);

    // Generate JWT tokens
    const { accessToken, refreshToken } = this.generateTokens(admin, session.id);

    // Update admin login info
    admin.lastLoginAt = new Date();
    admin.lastLoginIP = this.getClientIp(req);
    admin.lastUserAgent = req.get('User-Agent') || 'Unknown';
    admin.failedLoginAttempts = 0;
    admin.lockedUntil = null;
    await this.adminRepository.save(admin);

    // Set refresh token as HTTP-only cookie
    this.setRefreshTokenCookie(res, refreshToken);

    logger.info(`Admin logged in successfully: ${email}`);

    return {
      success: true,
      message: 'Login successful',
      data: {
        admin: this.sanitizeAdmin(admin),
        accessToken,
        expiresIn: 3600, // 1 hour in seconds
        mustChangePassword: admin.mustChangePassword,
      },
    };
  }

  /**
   * Admin Logout
   */
  async logout(admin: Admin, sessionId: string, res: Response) {
    // Invalidate the current session
    await this.sessionRepository.update({ id: sessionId, adminId: admin.id }, { isActive: false });

    // Clear refresh token cookie
    this.clearRefreshTokenCookie(res);

    logger.info(`Admin logged out: ${admin.email}`);

    return {
      success: true,
      message: 'Logout successful',
    };
  }

  /**
   * Refresh Access Token
   */
  async refreshToken(refreshToken: string, req: Request, res: Response) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get('ADMIN_REFRESH_SECRET'),
      });

      // Find session
      const session = await this.sessionRepository.findOne({
        where: {
          id: payload.sessionId,
          adminId: payload.sub,
          isActive: true,
        },
        relations: ['admin'],
      });

      if (!session) {
        throw new UnauthorizedException('Invalid session');
      }

      // Check if session is expired
      if (new Date() > session.refreshTokenExpiresAt) {
        await this.sessionRepository.update({ id: session.id }, { isActive: false });
        throw new UnauthorizedException('Session expired. Please login again.');
      }

      // Check if admin is still active
      if (!session.admin.isActive) {
        await this.sessionRepository.update({ id: session.id }, { isActive: false });
        throw new UnauthorizedException('Account is deactivated');
      }

      // Generate new tokens
      const tokens = this.generateTokens(session.admin, session.id);

      // Update session
      session.lastActivityAt = new Date();
      session.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await this.sessionRepository.save(session);

      // Set new refresh token cookie
      this.setRefreshTokenCookie(res, tokens.refreshToken);

      return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: tokens.accessToken,
          expiresIn: 3600,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Get Current Admin Profile
   */
  async getProfile(admin: Admin) {
    const fullAdmin = await this.adminRepository.findOne({
      where: { id: admin.id },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'role',
        'permissions',
        'isActive',
        'totpEnabled',
        'lastLoginAt',
        'mustChangePassword',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!fullAdmin) {
      throw new UnauthorizedException('Admin not found');
    }

    // Get backup codes count
    const adminWithBackupCodes = await this.adminRepository
      .createQueryBuilder('admin')
      .addSelect('admin.totpBackupCodes')
      .where('admin.id = :id', { id: admin.id })
      .getOne();

    const backupCodesCount = adminWithBackupCodes?.totpBackupCodes?.length || 0;

    return {
      success: true,
      data: {
        admin: {
          ...this.sanitizeAdmin(fullAdmin),
          backupCodesRemaining: backupCodesCount,
        },
      },
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Create Admin Session
   */
  private async createSession(admin: Admin, req: Request): Promise<AdminSession> {
    const session = this.sessionRepository.create({
      adminId: admin.id,
      token: crypto.randomBytes(32).toString('hex'),
      refreshToken: crypto.randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ipAddress: this.getClientIp(req),
      userAgent: req.get('User-Agent') || 'Unknown',
      deviceInfo: this.extractDeviceInfo(req),
      location: null as string | null,
      isActive: true,
      lastActivityAt: new Date(),
    });

    return this.sessionRepository.save(session);
  }

  /**
   * Generate JWT Tokens
   */
  private generateTokens(admin: Admin, sessionId: string) {
    const payload: JwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      sessionId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('ADMIN_JWT_SECRET'),
      expiresIn: '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('ADMIN_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  /**
   * Increment Failed Login Attempts
   */
  private async incrementFailedAttempts(admin: Admin): Promise<void> {
    admin.failedLoginAttempts += 1;

    if (admin.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      admin.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      logger.warn(
        `Admin account locked due to failed login attempts: ${admin.email} (${admin.failedLoginAttempts} attempts)`,
      );
    }

    await this.adminRepository.save(admin);
  }

  /**
   * Set Refresh Token Cookie
   */
  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie('admin_refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/admin/auth/refresh',
    });
  }

  /**
   * Clear Refresh Token Cookie
   */
  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie('admin_refresh_token', {
      path: '/api/v1/admin/auth/refresh',
    });
  }

  /**
   * Get Client IP Address
   */
  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      'Unknown'
    );
  }

  /**
   * Extract Device Info from User Agent
   */
  private extractDeviceInfo(req: Request): string {
    const userAgent = req.get('User-Agent') || '';

    // Simple device detection (consider using a library like 'ua-parser-js' for production)
    if (/mobile/i.test(userAgent)) return 'Mobile';
    if (/tablet/i.test(userAgent)) return 'Tablet';
    return 'Desktop';
  }

  /**
   * Sanitize Admin Object (Remove Sensitive Fields)
   */
  private sanitizeAdmin(admin: Admin) {
    const {
      passwordHash,
      totpSecret,
      totpBackupCodes,
      refreshToken,
      passwordHistory,
      resetToken,
      inviteToken,
      failedLoginAttempts,
      lockedUntil,
      ...sanitized
    } = admin as any;
    return sanitized;
  }
}
