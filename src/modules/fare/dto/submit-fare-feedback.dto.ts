// src/modules/fare/dto/submit-fare-feedback.dto.ts
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitFareFeedbackDto {
  @ApiProperty()
  @IsString()
  routeId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  routeStepId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  farePaid: number;

  @ApiProperty()
  @IsString()
  transportMode: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  additionalNotes?: string;
}
