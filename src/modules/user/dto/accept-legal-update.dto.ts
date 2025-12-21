// src/modules/user/dto/accept-legal-update.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class AcceptLegalUpdateDto {
  @ApiProperty({
    description: 'Indicates user has read and accepted the updated Terms of Service',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  acceptTerms?: boolean;

  @ApiProperty({
    description: 'Indicates user has read and accepted the updated Privacy Policy',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  acceptPrivacy?: boolean;
}
