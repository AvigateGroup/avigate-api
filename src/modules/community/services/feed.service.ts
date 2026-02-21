// src/modules/community/services/feed.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunityPost, PostType } from '../entities/community-post.entity';
import { User } from '../../user/entities/user.entity';
import { WebsocketService } from '../../websocket/websocket.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';

interface FeedPreferences {
  userId: string;
  enabledPostTypes: PostType[];
  cities: string[];
  mutedUsers: string[];
  enableRealTimeUpdates: boolean;
}

@Injectable()
export class FeedService {
  private userPreferences: Map<string, FeedPreferences> = new Map();

  constructor(
    @InjectRepository(CommunityPost)
    private postRepository: Repository<CommunityPost>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private websocketService: WebsocketService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Get personalized feed for user
   */
  async getUserFeed(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      postTypes?: PostType[];
      city?: string;
    } = {},
  ) {
    const { page = 1, limit = 20, postTypes, city } = options;
    const preferences = await this.getUserPreferences(userId);

    // Build query
    const query = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.location', 'location')
      .where('post.isActive = :isActive', { isActive: true })
      .andWhere('post.authorId NOT IN (:...mutedUsers)', {
        mutedUsers: preferences.mutedUsers.length > 0 ? preferences.mutedUsers : [''],
      });

    // Filter by post types
    const allowedTypes = postTypes || preferences.enabledPostTypes;
    if (allowedTypes.length > 0) {
      query.andWhere('post.postType IN (:...postTypes)', { postTypes: allowedTypes });
    }

    // Filter by city
    if (city) {
      query.andWhere('location.city = :city', { city });
    } else if (preferences.cities.length > 0) {
      query.andWhere('location.city IN (:...cities)', { cities: preferences.cities });
    }

    const [posts, total] = await query
      .orderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      success: true,
      data: {
        posts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * Create post and notify relevant users
   */
  async createPostWithNotifications(
    postData: Partial<CommunityPost>,
    authorId: string,
  ): Promise<CommunityPost> {
    const post = this.postRepository.create({
      ...postData,
      authorId,
      isActive: true,
      isVerified: false,
    });

    await this.postRepository.save(post);

    // Find users who should be notified
    if (post.postType === PostType.TRAFFIC_UPDATE || post.postType === PostType.ROUTE_ALERT) {
      await this.notifyRelevantUsers(post);
    }

    // Broadcast via WebSocket
    this.broadcastNewPost(post);

    return post;
  }

  /**
   * Update user feed preferences
   */
  async updatePreferences(userId: string, preferences: Partial<FeedPreferences>) {
    const current = await this.getUserPreferences(userId);
    const updated = { ...current, ...preferences };
    this.userPreferences.set(userId, updated);

    // Persist to database (you'll need a UserPreferences entity)
    return {
      success: true,
      data: { preferences: updated },
    };
  }

  /**
   * Toggle real-time updates
   */
  async toggleRealTimeUpdates(userId: string, enabled: boolean) {
    const preferences = await this.getUserPreferences(userId);
    preferences.enableRealTimeUpdates = enabled;
    this.userPreferences.set(userId, preferences);

    return {
      success: true,
      data: { realTimeUpdates: enabled },
    };
  }

  /**
   * Mute/unmute user
   */
  async muteUser(userId: string, targetUserId: string, mute: boolean) {
    const preferences = await this.getUserPreferences(userId);

    if (mute) {
      if (!preferences.mutedUsers.includes(targetUserId)) {
        preferences.mutedUsers.push(targetUserId);
      }
    } else {
      preferences.mutedUsers = preferences.mutedUsers.filter(id => id !== targetUserId);
    }

    this.userPreferences.set(userId, preferences);

    return {
      success: true,
      data: { mutedUsers: preferences.mutedUsers },
    };
  }

  /**
   * Get trending posts in city
   */
  async getTrendingPosts(city: string, hours: number = 24) {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const posts = await this.postRepository
      .createQueryBuilder('post')
      .leftJoin('locations', 'loc', 'post.locationId = loc.id')
      .where('loc.city = :city', { city })
      .andWhere('post.createdAt >= :since', { since })
      .andWhere('post.isActive = :isActive', { isActive: true })
      .orderBy('(post.upvotes - post.downvotes)', 'DESC')
      .addOrderBy('post.createdAt', 'DESC')
      .take(20)
      .getMany();

    return {
      success: true,
      data: { posts },
    };
  }

  /**
   * Private: Get user preferences
   */
  private async getUserPreferences(userId: string): Promise<FeedPreferences> {
    if (this.userPreferences.has(userId)) {
      return this.userPreferences.get(userId)!;
    }

    // Load from database or create default
    const user = await this.userRepository.findOne({ where: { id: userId } });

    const defaultPreferences: FeedPreferences = {
      userId,
      enabledPostTypes: Object.values(PostType),
      cities: user?.country === 'Nigeria' ? ['Port Harcourt', 'Lagos', 'Abuja'] : [],
      mutedUsers: [],
      enableRealTimeUpdates: true,
    };

    this.userPreferences.set(userId, defaultPreferences);
    return defaultPreferences;
  }

  /**
   * Private: Notify relevant users about new post
   */
  private async notifyRelevantUsers(post: CommunityPost) {
    // Find users subscribed to this location/route
    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true });

    // Add location-based filtering here
    const users = await query.getMany();

    // Send push notifications (in batches)
    const notificationPromises = users.map(user => {
      const preferences = this.userPreferences.get(user.id);
      if (preferences?.enableRealTimeUpdates) {
        return this.notificationsService.sendToUser(user.id, {
          title: post.postType === PostType.TRAFFIC_UPDATE ? 'Traffic Update' : 'Route Alert',
          body: post.title,
          type: NotificationType.COMMUNITY_POST,
          data: {
            postId: post.id,
            postType: post.postType,
          },
        });
      }
    });

    await Promise.allSettled(notificationPromises);
  }

  /**
   * Private: Broadcast new post via WebSocket
   */
  private broadcastNewPost(post: CommunityPost) {
    // Broadcast to all users in the same location
    if (post.locationId) {
      this.websocketService.sendTrafficUpdate(post.locationId, {
        type: 'new_post',
        post,
      });
    }
  }
}
