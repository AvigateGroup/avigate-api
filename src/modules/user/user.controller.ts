// src/modules/user/user.controller.ts
import { Controller, Get, Put, Delete, Body, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from './entities/user.entity';

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
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(user, updateProfileDto);
  }

  @Get('devices')
  @ApiOperation({ summary: 'Get user devices' })
  async getDevices(@CurrentUser() user: User) {
    return this.userService.getUserDevices(user);
  }

  @Delete('devices/:deviceId')
  @ApiOperation({ summary: 'Deactivate device' })
  async deactivateDevice(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
  ) {
    return this.userService.deactivateDevice(user, deviceId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  async getUserStats(@CurrentUser() user: User) {
    return this.userService.getUserStats(user);
  }

  @Delete('account')
  @ApiOperation({ summary: 'Delete user account' })
  async deleteAccount(
    @CurrentUser() user: User,
    @Body('password') password: string,
    @Body('confirmDelete') confirmDelete: string,
  ) {
    return this.userService.deleteAccount(user, password, confirmDelete);
  }
}