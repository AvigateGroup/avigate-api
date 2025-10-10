// src/modules/admin/strategies/admin-jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../entities/admin.entity';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private configService: ConfigService,
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('ADMIN_JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    console.log('🔍 JWT Strategy - Validating payload:', payload);
    
    const admin = await this.adminRepository.findOne({
      where: { id: payload.sub, isActive: true },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'permissions', 'isActive'],
    });

    console.log('🔍 JWT Strategy - Found admin:', {
      id: admin?.id,
      email: admin?.email,
      role: admin?.role,
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found or inactive');
    }

    return admin;
  }
}