// src/modules/community/dto/create-contribution.dto.ts
import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContributionDto {
  @ApiProperty()
  @IsString()
  contributionType: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  routeId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  startLocationId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  endLocationId?: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsObject()
  proposedData: Record<string, any>;
}