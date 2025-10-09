// src/common/guards/admin-auth.guard.ts
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminSession } from '@/modules/admin/entities/admin-session.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminAuthGuard extends AuthGuard('admin-jwt') {
  constructor(
    @InjectRepository(AdminSession)
    private sessionRepository: Repository<AdminSession>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First, validate JWT
    const isValid = await super.canActivate(context);
    if (!isValid) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    try {
      // Decode token to get session ID
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('ADMIN_JWT_SECRET'),
      });

      // Validate session
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

      // Check if session expired
      if (new Date() > session.expiresAt) {
        await this.sessionRepository.update({ id: session.id }, { isActive: false });
        throw new UnauthorizedException('Session expired');
      }

      // Check if admin is still active
      if (!session.admin.isActive) {
        await this.sessionRepository.update({ id: session.id }, { isActive: false });
        throw new UnauthorizedException('Account is deactivated');
      }

      // Update last activity
      await this.sessionRepository.update(
        { id: session.id },
        { lastActivityAt: new Date() }
      );

      // Attach session ID to request
      request.sessionId = session.id;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  handleRequest(err: any, admin: any, info: any) {
    if (err || !admin) {
      throw err || new UnauthorizedException('Unauthorized access');
    }
    return admin;
  }
}