// src/modules/journey/dto/index.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsUUID, Min, Max } from 'class-validator';

export class CreateJourneyDto {
  @ApiProperty({ description: 'Route ID (if using pre-defined route)' })
  @IsOptional()
  @IsUUID()
  routeId?: string;

  @ApiProperty({ description: 'Start location name' })
  @IsString()
  startLocation: string;

  @ApiProperty({ description: 'Start latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  startLatitude: number;

  @ApiProperty({ description: 'Start longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  startLongitude: number;

  @ApiProperty({ description: 'End location name' })
  @IsString()
  endLocation: string;

  @ApiProperty({ description: 'End latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  endLatitude: number;

  @ApiProperty({ description: 'End longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  endLongitude: number;

  @ApiPropertyOptional({ description: 'Landmark near destination' })
  @IsOptional()
  @IsString()
  endLandmark?: string;

  @ApiPropertyOptional({ description: 'Enable real-time tracking', default: true })
  @IsOptional()
  @IsBoolean()
  trackingEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable notifications', default: true })
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;
}

export class StartJourneyDto {
  @ApiPropertyOptional({ description: 'Current latitude' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Current longitude' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

export class UpdateJourneyLocationDto {
  @ApiProperty({ description: 'Current latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Current longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ description: 'Accuracy in meters' })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiPropertyOptional({ description: 'Speed in m/s' })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiPropertyOptional({ description: 'Bearing in degrees' })
  @IsOptional()
  @IsNumber()
  bearing?: number;
}

export class RateJourneyDto {
  @ApiProperty({ description: 'Rating (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Optional feedback' })
  @IsOptional()
  @IsString()
  feedback?: string;
}
