// src/modules/admin/dto/admin-login.dto.ts
import { IsEmail, IsString, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@avigate.co' })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  totpToken?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  backupCode?: string;
}
