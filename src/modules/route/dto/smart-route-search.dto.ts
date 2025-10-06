// src/modules/route/dto/smart-route-search.dto.ts
import { IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SmartRouteSearchDto {
  @ApiProperty({ required: false, description: 'Start address (alternative to coordinates)' })
  @IsOptional()
  @IsString()
  startAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsLatitude()
  startLat?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsLongitude()
  startLng?: number;

  @ApiProperty({ required: false, description: 'End address (alternative to coordinates)' })
  @IsOptional()
  @IsString()
  endAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsLatitude()
  endLat?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsLongitude()
  endLng?: number;
}