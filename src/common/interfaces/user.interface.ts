// src/common/interfaces/user.interface.ts

import { UserSex } from '@/modules/user/entities/user.entity';

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  sex: UserSex;
  phoneNumber: string;
  googleId?: string;
  profilePicture?: string;
  preferredLanguage: string;
  isVerified: boolean;
  isActive: boolean;
  isTestAccount: boolean;
  lastLoginAt?: Date;
  reputationScore: number;
  totalContributions: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDevice {
  id: string;
  userId: string;
  fcmToken?: string;
  deviceFingerprint: string;
  deviceInfo?: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  platform: 'ios' | 'android' | 'web' | 'unknown';
  appVersion?: string;
  ipAddress?: string;
  lastActiveAt: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserOTP {
  id: string;
  userId: string;
  otpCode: string;
  otpType: 'email_verification' | 'login_verification' | 'password_reset' | 'phone_verification';
  expiresAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  attempts: number;
  ipAddress?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserStats {
  userId: string;
  email: string;
  isVerified: boolean;
  isTestAccount: boolean;
  memberSince: Date;
  lastLogin?: Date;
  reputationScore: number;
  totalContributions: number;
  totalDevices: number;
  activeDevices: number;
  totalOTPs: number;
  usedOTPs: number;
}

export interface IJwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}