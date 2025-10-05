// src/modules/admin/services/admin-permission.service.ts

import { Injectable } from '@nestjs/common';
import { AdminRole } from '../entities/admin.entity';

@Injectable()
export class AdminPermissionService {
  async getRolesAndPermissions() {
    return {
      success: true,
      data: {
        roles: Object.values(AdminRole),
        permissions: this.getPermissionsList(),
        rolePermissions: {
          [AdminRole.SUPER_ADMIN]: this.getRolePermissions(AdminRole.SUPER_ADMIN),
          [AdminRole.ADMIN]: this.getRolePermissions(AdminRole.ADMIN),
          [AdminRole.MODERATOR]: this.getRolePermissions(AdminRole.MODERATOR),
          [AdminRole.ANALYST]: this.getRolePermissions(AdminRole.ANALYST),
        },
      },
    };
  }

  getRolePermissions(role: AdminRole): string[] {
    const permissions = {
      [AdminRole.ANALYST]: ['users.view', 'analytics.view', 'reports.generate'],
      [AdminRole.MODERATOR]: ['users.view', 'users.edit', 'content.moderate', 'analytics.view'],
      [AdminRole.ADMIN]: [
        'users.view',
        'users.create',
        'users.edit',
        'users.delete',
        'analytics.view',
        'analytics.export',
        'content.moderate',
        'admins.view',
      ],
      [AdminRole.SUPER_ADMIN]: ['*'],
    };

    return permissions[role] || [];
  }

  getPermissionsList(): string[] {
    return [
      'users.view',
      'users.create',
      'users.edit',
      'users.delete',
      'analytics.view',
      'analytics.export',
      'reports.generate',
      'content.moderate',
      'admins.view',
      'admins.create',
      'admins.edit',
      'admins.delete',
    ];
  }
}
