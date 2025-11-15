// src/modules/location-share/location-share.controller.ts
import { Controller, Get, Post, Body, Param, Query, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { LocationShareService } from './location-share.service';
import { CreateLocationShareDto } from './dto/create-location-share.dto';
import { ShareStatus } from './entities/location-share.entity';

@ApiTags('location-share')
@Controller('location-share')
export class LocationShareController {
  constructor(private locationShareService: LocationShareService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create location share' })
  async createShare(@CurrentUser() user: User, @Body() createShareDto: CreateLocationShareDto) {
    const share = await this.locationShareService.createShare(user.id, {
      shareType: createShareDto.shareType,
      locationName: createShareDto.locationName,
      latitude: createShareDto.latitude,
      longitude: createShareDto.longitude,
      description: createShareDto.description,
      expiresAt: createShareDto.expiresAt,
      maxAccess: createShareDto.maxAccess,
      allowedUserIds: createShareDto.allowedUserIds,
    });

    return {
      success: true,
      data: { share },
      message: 'Location shared successfully',
    };
  }

  @Get('token/:shareToken')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Access shared location' })
  async accessShare(
    @Param('shareToken') shareToken: string,
    @CurrentUser() user: User | undefined,
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
  ) {
    const accessorLocation =
      lat && lng
        ? {
            lat: Number(lat),
            lng: Number(lng),
          }
        : undefined;

    return this.locationShareService.accessShare(shareToken, user?.id, accessorLocation);
  }

  @Get('token/:shareToken/directions')
  @ApiOperation({ summary: 'Get directions to shared location' })
  async getDirections(
    @Param('shareToken') shareToken: string,
    @Query('fromLat') fromLat: number,
    @Query('fromLng') fromLng: number,
  ) {
    return this.locationShareService.getDirectionsToShare(
      shareToken,
      Number(fromLat),
      Number(fromLng),
    );
  }

  @Patch(':shareId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update share status' })
  async updateStatus(
    @CurrentUser() user: User,
    @Param('shareId') shareId: string,
    @Body('status') status: ShareStatus,
  ) {
    return this.locationShareService.updateShareStatus(user.id, shareId, status);
  }

  @Get('my-shares')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user created shares' })
  async getUserShares(@CurrentUser() user: User, @Query('status') status?: ShareStatus) {
    return this.locationShareService.getUserShares(user.id, status);
  }

  @Get('accessible')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get shares accessible by user' })
  async getAccessibleShares(@CurrentUser() user: User) {
    return this.locationShareService.getAccessibleShares(user.id);
  }

  @Post('event')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Share location for event' })
  async shareEventLocation(@CurrentUser() user: User, @Body() eventData: any) {
    const share = await this.locationShareService.shareEventLocation(user.id, eventData);

    return {
      success: true,
      data: { share },
      message: 'Event location shared successfully',
    };
  }

  @Get('token/:shareToken/qr-code')
  @ApiOperation({ summary: 'Get QR code for shared location' })
  async getQRCode(
    @Param('shareToken') shareToken: string,
    @Query('format') format?: 'dataUrl' | 'url',
  ) {
    return this.locationShareService.getShareQRCode(shareToken, format || 'dataUrl');
  }

  @Get('token/:shareToken/qr-code/print')
  @ApiOperation({ summary: 'Get printable QR code HTML' })
  async getPrintableQRCode(@Param('shareToken') shareToken: string) {
    return this.locationShareService.getPrintableQRCode(shareToken);
  }

  @Post(':shareId/qr-code/regenerate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate QR code for share' })
  async regenerateQRCode(@CurrentUser() user: User, @Param('shareId') shareId: string) {
    return this.locationShareService.regenerateQRCode(user.id, shareId);
  }
}
