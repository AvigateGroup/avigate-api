// src/common/guards/admin-auth.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminAuthGuard extends AuthGuard('admin-jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, admin: any) {
    if (err || !admin) {
      throw err || new UnauthorizedException('Invalid admin credentials');
    }
    return admin;
  }
}
