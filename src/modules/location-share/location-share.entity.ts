// src/modules/location-share/entities/location-share.entity.ts
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
import { User } from '../user/entities/user.entity';

export enum ShareType {
  PUBLIC = 'public',       // Anyone with link
  PRIVATE = 'private',     // Only specified users
  EVENT = 'event',         // Public event
  BUSINESS = 'business',   // Business location
}

export enum ShareStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

@Entity('location_shares')
export class LocationShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  ownerId: string;

  @Column({ unique: true })
  @Index()
  shareToken: string;

  @Column()
  shareUrl: string;

  @Column({
    type: 'enum',
    enum: ShareType,
    default: ShareType.PUBLIC,
  })
  shareType: ShareType;

  @Column()
  locationName: string;

  @Column('decimal', { precision: 10, scale: 7 })
  latitude: number;

  @Column('decimal', { precision: 10, scale: 7 })
  longitude: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'int', nullable: true })
  maxAccess: number;

  @Column({ type: 'simple-array', default: [] })
  allowedUserIds: string[];

  @Column({
    type: 'enum',
    enum: ShareStatus,
    default: ShareStatus.ACTIVE,
  })
  @Index()
  status: ShareStatus;

  @Column({ default: 0 })
  accessCount: number;

  @Column('uuid', { nullable: true })
  lastAccessedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt: Date;

  // For event shares
  @Column({ type: 'timestamp', nullable: true })
  eventDate: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ownerId' })
  owner: User;
}