// src/modules/route/dto/update-location.dto.ts
import { IsLatitude, IsLongitude, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLocationDto {
  @ApiProperty()
  @IsLatitude()
  lat: number;

  @ApiProperty()
  @IsLongitude()
  lng: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  accuracy?: number;
}