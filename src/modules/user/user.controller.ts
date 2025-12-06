// src/modules/user/user.controller.ts

import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  Body,
  UseGuards,
  Param,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { UploadFileDto } from '../user/dto/upload-file.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  async getProfile(@CurrentUser() user: User) {
    return this.userService.getProfile(user);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@CurrentUser() user: User, @Body() updateProfileDto: UpdateProfileDto) {
    return this.userService.updateProfile(user, updateProfileDto);
  }

  @Post('profile/picture')
  @ApiOperation({ summary: 'Upload profile picture' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFileDto })
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePicture(@CurrentUser() user: User, @UploadedFile() file: Express.Multer.File) {
    return this.userService.uploadProfilePicture(user, file);
  }

  @Get('devices')
  @ApiOperation({ summary: 'Get user devices' })
  async getDevices(@CurrentUser() user: User) {
    return this.userService.getUserDevices(user);
  }

  @Delete('devices/:deviceId')
  @ApiOperation({ summary: 'Deactivate device' })
  async deactivateDevice(@CurrentUser() user: User, @Param('deviceId') deviceId: string) {
    return this.userService.deactivateDevice(user, deviceId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  async getUserStats(@CurrentUser() user: User) {
    return this.userService.getUserStats(user);
  }

  @Delete('account')
  @ApiOperation({ summary: 'Delete user account' })
  async deleteAccount(@CurrentUser() user: User, @Body() deleteAccountDto: DeleteAccountDto) {
    return this.userService.deleteAccount(user, deleteAccountDto.confirmDelete);
  }
}
