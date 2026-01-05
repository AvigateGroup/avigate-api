// src/modules/notifications/dto/mark-read.dto.ts
import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkReadDto {
  @ApiProperty({
    description: 'Mark as read or unread',
    example: true,
  })
  @IsBoolean()
  isRead: boolean;
}
