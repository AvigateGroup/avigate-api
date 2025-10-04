// src/modules/user/dto/login.dto.ts
import { IsEmail, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fcmToken?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}
