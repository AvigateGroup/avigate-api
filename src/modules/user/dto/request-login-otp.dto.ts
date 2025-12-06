// src/modules/user/dto/request-login-otp.dto.ts
import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestLoginOtpDto {
  @ApiProperty({ 
    example: 'user@example.com',
    description: 'Email address to receive login OTP'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}