// src/modules/user/dto/update-profile.dto.ts
import { IsString, IsOptional, MinLength, MaxLength, IsEnum, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserSex } from '../entities/user.entity';

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @ApiProperty({ required: false, enum: UserSex })
  @IsOptional()
  @IsEnum(UserSex)
  sex?: UserSex;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  profilePicture?: string;

  @ApiProperty({ required: false, example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, example: 'Nigeria' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  country?: string;

  @ApiProperty({ required: false, example: 'en' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  language?: string;
}