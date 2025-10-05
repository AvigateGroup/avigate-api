// src/modules/admin/services/admin-session-manager.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminSession } from '../entities/admin-session.entity';
import { Admin } from '../entities/admin.entity';
import * as crypto from 'crypto';

interface SessionData {
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  location?: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  sessionId: string;
}

@Injectable()
export class AdminSessionManagerService {
  constructor(
    @InjectRepository(AdminSession)
    private sessionRepository: Repository<AdminSession>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Create a new session for an admin
   */
  async createSession(
    admin: Admin,
    sessionData: SessionData,
  ): Promise<{ accessToken: string; refreshToken: string; session: AdminSession }> {
    // Generate tokens
    const token = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(32).toString('hex');

    // Calculate expiration times
    const now = new Date();
    const accessTokenExpiry = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
    const refreshTokenExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create session record
    const session = this.sessionRepository.create({
      adminId: admin.id,
      token,
      refreshToken,
      expiresAt: accessTokenExpiry,
      refreshTokenExpiresAt: refreshTokenExpiry,
      ipAddress: sessionData.ipAddress,
      userAgent: sessionData.userAgent,
      deviceInfo: sessionData.deviceInfo,
      location: sessionData.location,
      isActive: true,
      lastActivityAt: now,
    });

    await this.sessionRepository.save(session);

    // Generate JWT access token
    const jwtPayload: JwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      sessionId: session.id,
    };

    const accessToken = this.jwtService.sign(jwtPayload, {
      expiresIn: '1h',
    });

    return { accessToken, refreshToken, session };
  }

  /**
   * Validate and refresh a session
   */
  async refreshSession(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const session = await this.sessionRepository.findOne({
      where: { refreshToken, isActive: true },
      relations: ['admin'],
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if refresh token is expired
    if (new Date() > session.refreshTokenExpiresAt) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException('Refresh token expired');
    }

    // Check if admin is still active
    if (!session.admin.isActive) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException('Admin account is inactive');
    }

    // Generate new tokens
    const newToken = crypto.randomBytes(32).toString('hex');
    const newRefreshToken = crypto.randomBytes(32).toString('hex');

    // Update session
    const now = new Date();
    session.token = newToken;
    session.refreshToken = newRefreshToken;
    session.expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
    session.refreshTokenExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    session.lastActivityAt = now;

    await this.sessionRepository.save(session);

    // Generate new JWT
    const jwtPayload: JwtPayload = {
      sub: session.admin.id,
      email: session.admin.email,
      role: session.admin.role,
      sessionId: session.id,
    };

    const accessToken = this.jwtService.sign(jwtPayload, {
      expiresIn: '1h',
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Get all active sessions for an admin
   */
  async getAdminSessions(adminId: string): Promise<AdminSession[]> {
    return this.sessionRepository.find({
      where: { adminId, isActive: true },
      order: { lastActivityAt: 'DESC' },
    });
  }

  /**
   * Get a specific session
   */
  async getSession(sessionId: string): Promise<AdminSession | null> {
    return this.sessionRepository.findOne({
      where: { id: sessionId, isActive: true },
      relations: ['admin'],
    });
  }

  /**
   * Validate a session by ID
   */
  async validateSession(sessionId: string): Promise<AdminSession> {
    const session = await this.getSession(sessionId);

    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      await this.revokeSession(sessionId);
      throw new UnauthorizedException('Session expired');
    }

    // Check if admin is still active
    if (!session.admin.isActive) {
      await this.revokeSession(sessionId);
      throw new UnauthorizedException('Admin account is inactive');
    }

    // Update last activity
    session.lastActivityAt = new Date();
    await this.sessionRepository.save(session);

    return session;
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepository.update({ id: sessionId }, { isActive: false });
  }

  /**
   * Revoke all sessions for an admin
   */
  async removeAllAdminSessions(adminId: string): Promise<number> {
    const result = await this.sessionRepository.update(
      { adminId, isActive: true },
      { isActive: false },
    );

    return result.affected || 0;
  }

  /**
   * Revoke all sessions except the current one
   */
  async revokeOtherSessions(adminId: string, currentSessionId: string): Promise<number> {
    const result = await this.sessionRepository
      .createQueryBuilder()
      .update(AdminSession)
      .set({ isActive: false })
      .where('adminId = :adminId', { adminId })
      .andWhere('id != :sessionId', { sessionId: currentSessionId })
      .andWhere('isActive = :isActive', { isActive: true })
      .execute();

    return result.affected || 0;
  }

  /**
   * Clean up expired sessions (run as a cron job)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sessionRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    return result.affected || 0;
  }

  /**
   * Get session count for an admin
   */
  async getActiveSessionCount(adminId: string): Promise<number> {
    return this.sessionRepository.count({
      where: { adminId, isActive: true },
    });
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(
    sessionId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.sessionRepository.update(
      { id: sessionId },
      {
        lastActivityAt: new Date(),
        ...(ipAddress && { ipAddress }),
        ...(userAgent && { userAgent }),
      },
    );
  }
}
