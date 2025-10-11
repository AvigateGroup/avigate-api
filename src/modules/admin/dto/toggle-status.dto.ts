// Create: src/modules/admin/dto/toggle-status.dto.ts
import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleStatusDto {
  @ApiProperty({ 
    description: 'Set to true to activate, false to deactivate',
    example: true 
  })
  @IsBoolean()
  isActive: boolean;
}