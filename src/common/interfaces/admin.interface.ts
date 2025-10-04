// src/common/interfaces/admin.interface.ts

import { AdminRole } from '@/modules/admin/entities/admin.entity';

export interface IAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  permissions: string[];
  isActive: boolean;
  passwordChangedAt?: Date;
  lastLoginAt?: Date;
  lastLoginIP?: string;
  lastUserAgent?: string;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  totpEnabled: boolean;
  createdBy?: string;
  lastModifiedBy?: string;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface IAdminJwtPayload {
  adminId: string;
  email: string;
  role: AdminRole;
  iat?: number;
  exp?: number;
}

export interface IAdminAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IAdminSession {
  sessionId: string;
  adminId: string;
  tokenId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface IPermissionCheck {
  hasPermission: boolean;
  missingPermissions?: string[];
}

export interface IAdminInvitation {
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  tempPassword: string;
  inviteToken: string;
  expiresAt: Date;
}

export interface IAuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  resource: string;
  resourceId?: string;
  method?: string;
  endpoint?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
}