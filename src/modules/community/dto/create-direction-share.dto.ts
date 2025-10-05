// src/modules/community/dto/create-direction-share.dto.ts
import { IsString, IsOptional, IsObject, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateDirectionShareDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  startLocationId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  endLocationId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customInstructions?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  routePreferences?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;
}
