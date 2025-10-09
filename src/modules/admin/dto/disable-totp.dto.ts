// src/modules/admin/dto/disable-totp.dto.ts
import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DisableTotpDto {
  @ApiProperty({ example: 'YourPassword123!' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  totpToken: string;
}
