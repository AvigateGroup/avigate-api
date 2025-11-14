// src/modules/email/email.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserEmailService } from './user-email.service';
import { AdminEmailService } from './admin-email.service';
import { UserTripEmailService } from './user-trip-email.service';
import { CommunityEmailService } from './community-email.service';
import { LocationShareEmailService } from './location-share-email.service';

@Module({
  imports: [ConfigModule],
  providers: [UserEmailService, AdminEmailService, UserTripEmailService, CommunityEmailService,
    LocationShareEmailService,],
  exports: [UserEmailService, AdminEmailService, UserTripEmailService, CommunityEmailService,
    LocationShareEmailService,],
})
export class EmailModule {}
