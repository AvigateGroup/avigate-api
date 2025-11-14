// src/modules/location-share/dto/create-location-share.dto.ts
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  IsDate,
  Min,
  Max,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ShareType } from '../entities/location-share.entity';

export class CreateLocationShareDto {
  @ApiProperty({ enum: ShareType })
  @IsEnum(ShareType)
  shareType: ShareType;

  @ApiProperty()
  @IsString()
  locationName: string;

  @ApiProperty()
  @IsLatitude()
  latitude: number;

  @ApiProperty()
  @IsLongitude()
  longitude: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, type: Date })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxAccess?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedUserIds?: string[];

  @ApiProperty({ required: false, type: Date })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  eventDate?: Date;
}