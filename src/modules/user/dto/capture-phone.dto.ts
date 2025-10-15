// src/modules/user/dto/capture-phone.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserSex } from '../entities/user.entity';

export class CapturePhoneDto {
  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ example: 'male', enum: UserSex, required: false })
  @IsEnum(UserSex)
  @IsOptional()
  sex?: UserSex;
}
