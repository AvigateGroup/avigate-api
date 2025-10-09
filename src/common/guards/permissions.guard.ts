// src/common/guards/permissions.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Admin, AdminRole } from '@/modules/admin/entities/admin.entity';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const admin: Admin = request.user;

    if (!admin) {
      throw new ForbiddenException('Admin not found');
    }

    // Super admins have all permissions
    if (admin.role === AdminRole.SUPER_ADMIN) {
      return true;
    }

    // Check if admin has required permissions
    const hasPermission = requiredPermissions.every((permission) =>
      admin.permissions?.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}