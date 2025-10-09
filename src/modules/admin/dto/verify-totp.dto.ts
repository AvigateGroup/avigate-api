// src/modules/admin/dto/verify-totp.dto.ts
import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyTotpDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  totpToken: string;
}
