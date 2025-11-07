// src/modules/route/dto/find-routes.dto.ts
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FindRoutesDto {
  @ApiProperty()
  @IsString()
  startLocationId: string;

  @ApiProperty()
  @IsString()
  endLocationId: string;
}
