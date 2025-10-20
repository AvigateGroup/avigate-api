// src/modules/user/dto/google-auth.dto.ts

import { IsEmail, IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserSex } from '../entities/user.entity';

export class GoogleAuthDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  googleId: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: 'https://lh3.googleusercontent.com/...' })
  @IsOptional()
  @IsString()
  profilePicture?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'male', enum: UserSex })
  @IsOptional()
  @IsEnum(UserSex)
  sex?: UserSex;

  @ApiPropertyOptional({ example: 'Nigeria' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'English' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    example: 'fcm_token_here',
    description: 'Firebase Cloud Messaging token for push notifications',
  })
  @IsOptional()
  @IsString()
  fcmToken?: string;

  @ApiPropertyOptional({
    example: {
      userAgent: 'Mozilla/5.0...',
      platform: 'MacIntel',
      language: 'en-US',
    },
    description: 'Device information',
  })
  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, any>;

  @ApiPropertyOptional({
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
    description: 'Google ID token for verification (optional but recommended)',
  })
  @IsOptional()
  @IsString()
  idToken?: string;
}