// src/modules/user/dto/delete-account.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteAccountDto {
  @ApiProperty({ 
    example: 'DELETE_MY_ACCOUNT',
    description: 'Type "DELETE_MY_ACCOUNT" to confirm account deletion'
  })
  @IsString()
  @IsNotEmpty()
  confirmDelete: string;
}