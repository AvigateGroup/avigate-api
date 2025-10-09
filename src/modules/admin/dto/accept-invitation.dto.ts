// ==================== AUTH DTOs ====================

// src/modules/admin/dto/accept-invitation.dto.ts
import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInvitationDto {
  @ApiProperty({ example: 'abc123def456...' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewSecurePassword123!' })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newPassword: string;

  @ApiProperty({ example: 'NewSecurePassword123!' })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  confirmPassword: string;
}
