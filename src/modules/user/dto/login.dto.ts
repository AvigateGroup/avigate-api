// src/modules/user/dto/login.dto.ts
import { IsEmail, IsNotEmpty, IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'fcm_token_here' })
  @IsString()
  @IsOptional()
  fcmToken?: string;

  @ApiPropertyOptional({ example: 'Mozilla/5.0...' })
  @IsString()
  @IsOptional()
  deviceInfo?: string;
}