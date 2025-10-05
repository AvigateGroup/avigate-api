// src/modules/route/dto/find-routes.dto.ts
import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransportMode } from '../entities/route.entity';

export class FindRoutesDto {
  @ApiProperty()
  @IsString()
  startLocationId: string;

  @ApiProperty()
  @IsString()
  endLocationId: string;

  @ApiProperty({ required: false, enum: TransportMode, isArray: true })
  @IsOptional()
  @IsEnum(TransportMode, { each: true })
  preferredModes?: TransportMode[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxFare?: number;
}