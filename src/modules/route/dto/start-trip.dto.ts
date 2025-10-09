// src/modules/route/dto/start-trip.dto.ts
import { IsString, IsLatitude, IsLongitude } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartTripDto {
  @ApiProperty()
  @IsString()
  routeId: string;

  @ApiProperty()
  @IsLatitude()
  currentLat: number;

  @ApiProperty()
  @IsLongitude()
  currentLng: number;
}
