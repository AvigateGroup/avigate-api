// src/modules/user/dto/register.dto.ts
import { IsEmail, IsString, MinLength, MaxLength, IsEnum, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserSex } from '../entities/user.entity';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ enum: UserSex, example: UserSex.MALE })
  @IsEnum(UserSex)
  sex: UserSex;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @Matches(/^(\+234|234|0)(70|80|81|90|91)[0-9]{8}$/, {
    message: 'Please provide a valid Nigerian phone number',
  })
  phoneNumber: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fcmToken?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}