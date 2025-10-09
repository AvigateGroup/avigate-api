// src/modules/admin/dto/regenerate-backup-codes.dto.ts
import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegenerateBackupCodesDto {
  @ApiProperty({ example: 'YourPassword123!' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  totpToken: string;
}
