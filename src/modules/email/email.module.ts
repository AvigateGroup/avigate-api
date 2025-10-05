// src/modules/email/email.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserEmailService } from './user-email.service';
import { AdminEmailService } from './admin-email.service';

@Module({
  imports: [ConfigModule],
  providers: [UserEmailService, AdminEmailService],
  exports: [UserEmailService, AdminEmailService],
})
export class EmailModule {}
