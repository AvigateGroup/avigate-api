// src/modules/admin/dto/request-password-reset.dto.ts
import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'admin@avigate.co' })
  @IsEmail()
  email: string;
}