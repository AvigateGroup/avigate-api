// src/modules/notifications/entities/notification.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';

export enum NotificationType {
  TRIP_STARTED = 'trip_started',
  TRIP_COMPLETED = 'trip_completed',
  TRIP_CANCELLED = 'trip_cancelled',
  NEXT_STEP = 'next_step',
  APPROACHING_STOP = 'approaching_stop',
  LOCATION_SHARED = 'location_shared',
  COMMUNITY_POST = 'community_post',
  CONTRIBUTION_APPROVED = 'contribution_approved',
  CONTRIBUTION_REJECTED = 'contribution_rejected',
  SYSTEM_ALERT = 'system_alert',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  @Index()
  type: NotificationType;

  @Column()
  title: string;

  @Column('text')
  body: string;

  @Column('jsonb', { nullable: true })
  data: Record<string, any>;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: false })
  @Index()
  isRead: boolean;

  @Column({ nullable: true })
  actionUrl: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
