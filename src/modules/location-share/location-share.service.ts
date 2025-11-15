// src/modules/location-share/location-share.service.ts (UPDATED FOR YOUR UPLOAD SERVICE)
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as crypto from 'crypto';
import { LocationShare, ShareType, ShareStatus } from './entities/location-share.entity';
import { User } from '../user/entities/user.entity';
import { RouteMatchingService } from '../route/services/route-matching.service';
import { IntelligentRouteService } from '../route/services/intelligent-route.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QRCodeService } from './services/qr-code.service';
import { UploadService } from '../upload/upload.service';
import { logger } from '@/utils/logger.util';

interface CreateShareDto {
  shareType: ShareType;
  locationName: string;
  latitude: number;
  longitude: number;
  description?: string;
  expiresAt?: Date;
  maxAccess?: number;
  allowedUserIds?: string[];
  eventDate?: Date;
}

@Injectable()
export class LocationShareService {
  constructor(
    @InjectRepository(LocationShare)
    private shareRepository: Repository<LocationShare>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private routeMatchingService: RouteMatchingService,
    private intelligentRouteService: IntelligentRouteService,
    private notificationsService: NotificationsService,
    private qrCodeService: QRCodeService,
    private uploadService: UploadService,
  ) {}

  /**
   * Create a location share link with QR code
   */
  async createShare(userId: string, data: CreateShareDto): Promise<LocationShare> {
    const shareToken = this.generateShareToken();
    const shareUrl = `https://avigate.app/share/${shareToken}`;

    // Get user info for QR code
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const ownerName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';

    // Generate QR code
    const { qrCodeDataUrl, qrCodeBuffer } = await this.qrCodeService.generateLocationShareQR({
      shareUrl,
      locationName: data.locationName,
      ownerName,
      latitude: data.latitude,
      longitude: data.longitude,
    });

    // Upload QR code to S3 using uploadBuffer method
    let qrCodeImageUrl: string | undefined;
    try {
      // Generate unique filename for QR code
      const qrFileName = `qr-${shareToken}.png`;

      // UPDATED: Use uploadBuffer method which works with your service
      qrCodeImageUrl = await this.uploadService.uploadBuffer(
        qrCodeBuffer,
        qrFileName,
        'image/png',
        'qr-codes',
      );
    } catch (error) {
      logger.warn('Failed to upload QR code to S3:', error);
      // Continue without uploaded QR code - we still have data URL
    }

    const share = this.shareRepository.create({
      ownerId: userId,
      shareToken,
      shareUrl,
      shareType: data.shareType,
      locationName: data.locationName,
      latitude: data.latitude,
      longitude: data.longitude,
      description: data.description,
      expiresAt: data.expiresAt,
      maxAccess: data.maxAccess,
      allowedUserIds: data.allowedUserIds || [],
      eventDate: data.eventDate,
      status: ShareStatus.ACTIVE,
      accessCount: 0,
      metadata: {
        qrCodeDataUrl, // Base64 data URL
        qrCodeImageUrl, // S3 URL (if uploaded)
        createdVia: 'app',
      },
    });

    await this.shareRepository.save(share);

    // Notify allowed users if it's a private share
    if (data.shareType === ShareType.PRIVATE && data.allowedUserIds) {
      await this.notifyAllowedUsers(share);
    }

    return share;
  }

  /**
   * Get share and generate navigation
   */
  async accessShare(
    shareToken: string,
    accessorUserId?: string,
    accessorLocation?: {
      lat: number;
      lng: number;
    },
  ) {
    const share = await this.shareRepository.findOne({
      where: { shareToken },
      relations: ['owner'],
    });

    if (!share) {
      throw new NotFoundException('Share link not found or expired');
    }

    // Validate access
    this.validateAccess(share, accessorUserId);

    // Update access tracking
    share.accessCount += 1;
    share.lastAccessedAt = new Date();
    if (accessorUserId) {
      share.lastAccessedBy = accessorUserId;
    }
    await this.shareRepository.save(share);

    // Generate navigation if accessor location provided
    let navigation = null;
    if (accessorLocation) {
      const routes = await this.routeMatchingService.findSmartRoutes(
        accessorLocation.lat,
        accessorLocation.lng,
        Number(share.latitude),
        Number(share.longitude),
      );
      navigation = routes;
    }

    return {
      success: true,
      data: {
        share: {
          id: share.id,
          locationName: share.locationName,
          latitude: share.latitude,
          longitude: share.longitude,
          description: share.description,
          ownerName: `${share.owner.firstName} ${share.owner.lastName}`,
          shareType: share.shareType,
          createdAt: share.createdAt,
        },
        navigation,
      },
    };
  }

  /**
   * Get step-by-step directions to shared location
   */
  async getDirectionsToShare(shareToken: string, fromLat: number, fromLng: number) {
    const share = await this.shareRepository.findOne({
      where: { shareToken, status: ShareStatus.ACTIVE },
    });

    if (!share) {
      throw new NotFoundException('Share link not found');
    }

    const routes = await this.routeMatchingService.findSmartRoutes(
      fromLat,
      fromLng,
      Number(share.latitude),
      Number(share.longitude),
    );

    return {
      success: true,
      data: {
        destination: {
          name: share.locationName,
          description: share.description,
        },
        routes: routes.routes,
      },
    };
  }

  /**
   * Update share status
   */
  async updateShareStatus(userId: string, shareId: string, status: ShareStatus) {
    const share = await this.shareRepository.findOne({
      where: { id: shareId, ownerId: userId },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    share.status = status;
    await this.shareRepository.save(share);

    return {
      success: true,
      data: { share },
    };
  }

  /**
   * Get user's created shares
   */
  async getUserShares(userId: string, status?: ShareStatus) {
    const where: any = { ownerId: userId };
    if (status) {
      where.status = status;
    }

    const shares = await this.shareRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: { shares },
    };
  }

  /**
   * Get shares accessible by user
   */
  async getAccessibleShares(userId: string) {
    const shares = await this.shareRepository
      .createQueryBuilder('share')
      .where('share.status = :status', { status: ShareStatus.ACTIVE })
      .andWhere('(share.shareType = :public OR :userId = ANY(share.allowedUserIds))', {
        public: ShareType.PUBLIC,
        userId,
      })
      .andWhere('(share.expiresAt IS NULL OR share.expiresAt > :now)', { now: new Date() })
      .orderBy('share.createdAt', 'DESC')
      .take(50)
      .getMany();

    return {
      success: true,
      data: { shares },
    };
  }

  /**
   * Share location for event
   */
  async shareEventLocation(
    userId: string,
    eventData: {
      eventName: string;
      venue: string;
      latitude: number;
      longitude: number;
      eventDate: Date;
      description?: string;
    },
  ) {
    const expiresAt = new Date(eventData.eventDate);
    expiresAt.setHours(expiresAt.getHours() + 6); // Share expires 6 hours after event

    return this.createShare(userId, {
      shareType: ShareType.PUBLIC,
      locationName: `${eventData.eventName} at ${eventData.venue}`,
      latitude: eventData.latitude,
      longitude: eventData.longitude,
      description: eventData.description || `Join us at ${eventData.eventName}!`,
      expiresAt,
      eventDate: eventData.eventDate,
    });
  }

  /**
   * Get QR code for existing share
   */
  async getShareQRCode(shareToken: string, format: 'dataUrl' | 'url' = 'dataUrl') {
    const share = await this.shareRepository.findOne({
      where: { shareToken, status: ShareStatus.ACTIVE },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    // Return existing QR code if available
    if (format === 'dataUrl' && share.metadata?.qrCodeDataUrl) {
      return {
        success: true,
        data: {
          qrCode: share.metadata.qrCodeDataUrl,
          format: 'dataUrl',
        },
      };
    }

    if (format === 'url' && share.metadata?.qrCodeImageUrl) {
      return {
        success: true,
        data: {
          qrCode: share.metadata.qrCodeImageUrl,
          format: 'url',
        },
      };
    }

    // Generate new QR code if not available
    const owner = await this.userRepository.findOne({ where: { id: share.ownerId } });

    const { qrCodeDataUrl, qrCodeBuffer } = await this.qrCodeService.generateLocationShareQR({
      shareUrl: share.shareUrl,
      locationName: share.locationName,
      ownerName: owner ? `${owner.firstName} ${owner.lastName}` : 'Unknown',
      latitude: Number(share.latitude),
      longitude: Number(share.longitude),
    });

    // Update share with QR code
    share.metadata = {
      ...share.metadata,
      qrCodeDataUrl,
    };
    await this.shareRepository.save(share);

    return {
      success: true,
      data: {
        qrCode: format === 'dataUrl' ? qrCodeDataUrl : qrCodeDataUrl,
        format,
      },
    };
  }

  /**
   * Get printable QR code HTML
   */
  async getPrintableQRCode(shareToken: string) {
    const share = await this.shareRepository.findOne({
      where: { shareToken, status: ShareStatus.ACTIVE },
      relations: ['owner'],
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    const qrResult = await this.getShareQRCode(shareToken, 'dataUrl');
    const qrDataUrl = qrResult.data.qrCode;

    const html = this.qrCodeService.generatePrintableQRHTML(qrDataUrl, {
      locationName: share.locationName,
      ownerName: `${share.owner.firstName} ${share.owner.lastName}`,
      description: share.description,
      eventDate: share.eventDate,
    });

    return {
      success: true,
      data: { html },
    };
  }

  /**
   * Regenerate QR code for share
   */
  async regenerateQRCode(userId: string, shareId: string) {
    const share = await this.shareRepository.findOne({
      where: { id: shareId, ownerId: userId },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    const owner = await this.userRepository.findOne({ where: { id: userId } });

    const { qrCodeDataUrl, qrCodeBuffer } = await this.qrCodeService.generateLocationShareQR({
      shareUrl: share.shareUrl,
      locationName: share.locationName,
      ownerName: owner ? `${owner.firstName} ${owner.lastName}` : 'Unknown',
      latitude: Number(share.latitude),
      longitude: Number(share.longitude),
    });

    // Upload new QR code using uploadBuffer
    let qrCodeImageUrl: string | undefined;
    try {
      const qrFileName = `qr-${share.shareToken}.png`;

      qrCodeImageUrl = await this.uploadService.uploadBuffer(
        qrCodeBuffer,
        qrFileName,
        'image/png',
        'qr-codes',
      );
    } catch (error) {
      logger.warn('Failed to upload regenerated QR code:', error);
    }

    // Update share
    share.metadata = {
      ...share.metadata,
      qrCodeDataUrl,
      qrCodeImageUrl,
      lastQRRegeneration: new Date().toISOString(),
    };
    await this.shareRepository.save(share);

    return {
      success: true,
      data: {
        qrCodeDataUrl,
        qrCodeImageUrl,
      },
      message: 'QR code regenerated successfully',
    };
  }

  /**
   * Private: Validate access to share
   */
  private validateAccess(share: LocationShare, accessorUserId?: string) {
    // Check if expired
    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new NotFoundException('Share link has expired');
    }

    // Check status
    if (share.status !== ShareStatus.ACTIVE) {
      throw new NotFoundException('Share link is not active');
    }

    // Check max access
    if (share.maxAccess && share.accessCount >= share.maxAccess) {
      throw new NotFoundException('Share link has reached maximum access limit');
    }

    // Check private access
    if (share.shareType === ShareType.PRIVATE) {
      if (!accessorUserId || !share.allowedUserIds.includes(accessorUserId)) {
        throw new NotFoundException('You do not have permission to access this share');
      }
    }
  }

  /**
   * Private: Notify allowed users
   */
  private async notifyAllowedUsers(share: LocationShare) {
    const users = await this.userRepository.findBy({
      id: In(share.allowedUserIds),
    });

    const owner = await this.userRepository.findOne({
      where: { id: share.ownerId },
    });

    for (const user of users) {
      await this.notificationsService.sendToUser(user.id, {
        title: 'Location Shared',
        body: `${owner?.firstName} shared a location with you: ${share.locationName}`,
        data: {
          type: 'location_share',
          shareToken: share.shareToken,
          shareUrl: share.shareUrl,
        },
      });
    }
  }

  /**
   * Private: Generate unique share token
   */
  private generateShareToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}