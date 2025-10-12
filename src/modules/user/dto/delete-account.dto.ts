// src/modules/user/dto/delete-account.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({
    description: 'User password for verification',
    example: 'MySecurePassword123!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'Confirmation text - must be exactly "DELETE_MY_ACCOUNT"',
    example: 'DELETE_MY_ACCOUNT',
  })
  @IsString()
  @IsNotEmpty()
  confirmDelete: string;
}
