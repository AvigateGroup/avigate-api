// src/modules/user/dto/google-auth.dto.ts
import { IsEmail, IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserSex } from '../entities/user.entity';

export class GoogleAuthDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'google-id-12345' })
  @IsString()
  @IsNotEmpty()
  googleId: string;

  @ApiProperty({ example: 'https://example.com/photo.jpg', required: false })
  @IsString()
  @IsOptional()
  profilePicture?: string;

  @ApiProperty({ example: '+2348012345678', required: false })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'male', enum: UserSex, required: false })
  @IsEnum(UserSex)
  @IsOptional()
  sex?: UserSex;

  @ApiProperty({ example: 'Nigeria', required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ example: 'English', required: false })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({ example: 'fcm-token-here', required: false })
  @IsString()
  @IsOptional()
  fcmToken?: string;

  @ApiProperty({ example: 'iPhone 12, iOS 15', required: false })
  @IsString()
  @IsOptional()
  deviceInfo?: string;
}
