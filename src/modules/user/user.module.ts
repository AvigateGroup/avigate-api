// src/modules/user/user.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { UserDevice } from './entities/user-device.entity';
import { UserOTP } from './entities/user-otp.entity';
import { UserEmailService } from '../email/user-email.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserDevice, UserOTP]),
    UploadModule,
  ],
  controllers: [UserController],
  providers: [UserService, UserEmailService],
  exports: [UserService],
})
export class UserModule {}