// src/modules/user/entities/user-otp.entity.ts
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

export enum OTPType {
  EMAIL_VERIFICATION = 'email_verification',
  LOGIN_VERIFICATION = 'login_verification',
  LOGIN = 'login',
  PHONE_VERIFICATION = 'phone_verification',
}

@Entity('user_otps')
export class UserOTP {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column({ length: 10 })
  @Index()
  otpCode: string;

  @Column({
    type: 'enum',
    enum: OTPType,
  })
  @Index()
  otpType: OTPType;

  @Column({ type: 'timestamp' })
  @Index()
  expiresAt: Date;

  @Column({ default: false })
  @Index()
  isUsed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date;

  @Column({ default: 0 })
  attempts: number;

  @Column({ length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.otps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}
