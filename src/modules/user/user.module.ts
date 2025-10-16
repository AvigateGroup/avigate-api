// src/modules/user/user.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { UserDevice } from './entities/user-device.entity';
import { UserOTP } from './entities/user-otp.entity';
import { UserEmailService } from '../email/user-email.service';
import { UserUpdatesEmailService } from '../email/user-updates-email.service';
import { UploadModule } from '../upload/upload.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserDevice, UserOTP]), 
    UploadModule,
    forwardRef(() => AuthModule), // Import AuthModule to get access to VerificationService
  ],
  controllers: [UserController],
  providers: [UserService, UserEmailService, UserUpdatesEmailService],
  exports: [UserService],
})
export class UserModule {}