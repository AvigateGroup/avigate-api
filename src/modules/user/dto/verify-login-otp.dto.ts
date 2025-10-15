// src/modules/user/dto/verify-login-otp.dto.ts
import { IsEmail, IsNotEmpty, IsString, Length, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyLoginOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otpCode: string;

  @ApiProperty({ example: 'fcm-token-here', required: false })
  @IsString()
  @IsOptional()
  fcmToken?: string;

  @ApiProperty({ example: 'iPhone 12, iOS 15', required: false })
  @IsString()
  @IsOptional()
  deviceInfo?: string;
}
