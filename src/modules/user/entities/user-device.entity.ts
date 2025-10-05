// src/modules/user/entities/user-device.entity.ts
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
import { User } from './user.entity';

export enum DeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop',
  UNKNOWN = 'unknown',
}

export enum Platform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
  UNKNOWN = 'unknown',
}

@Entity('user_devices')
@Index(['userId', 'deviceFingerprint'], { unique: true })
export class UserDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column({ type: 'text', nullable: true })
  fcmToken: string | null;

  @Column()
  deviceFingerprint: string;

  @Column({ type: 'text', nullable: true })
  deviceInfo: string;

  @Column({
    type: 'enum',
    enum: DeviceType,
    default: DeviceType.UNKNOWN,
  })
  @Index()
  deviceType: DeviceType;

  @Column({
    type: 'enum',
    enum: Platform,
    default: Platform.UNKNOWN,
  })
  @Index()
  platform: Platform;

  @Column({ length: 20, nullable: true })
  appVersion: string;

  @Column({ length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Index()
  lastActiveAt: Date;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.devices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
