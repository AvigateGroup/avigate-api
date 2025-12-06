// src/modules/user/entities/user.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserDevice } from './user-device.entity';
import { UserOTP } from './user-otp.entity';

export enum UserSex {
  MALE = 'male',
  FEMALE = 'female',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserSex,
    nullable: true,
  })
  @Index()
  sex: UserSex;

  @Column({ unique: true, nullable: true })
  @Index()
  phoneNumber: string;

  @Column({ default: 'Nigeria' })
  country: string;

  @Column({ default: 'English' })
  language: string;

  @Column({ nullable: true, unique: true })
  @Index()
  googleId: string;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider: AuthProvider;

  @Column({ nullable: true })
  profilePicture: string;

  @Column({ default: 'English' })
  preferredLanguage: string;

  @Column({ default: false })
  @Index()
  isVerified: boolean;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @Column({ default: false })
  @Index()
  isTestAccount: boolean;

  @Column({ default: false })
  phoneNumberCaptured: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  lastLoginAt: Date;

  @Column({ type: 'text', nullable: true, select: false })
  refreshToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  refreshTokenExpiresAt: Date | null;

  @Column({ default: 100 })
  @Index()
  reputationScore: number;

  @Column({ default: 0 })
  totalContributions: number;

  @Column({ nullable: true, length: 10 })
  @Index()
  termsVersion: string;

  @Column({ nullable: true, length: 10 })
  @Index()
  privacyVersion: string;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  termsAcceptedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  privacyAcceptedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => UserDevice, device => device.user)
  devices: UserDevice[];

  @OneToMany(() => UserOTP, otp => otp.user)
  otps: UserOTP[];

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  toJSON() {
    const { refreshToken, ...user } = this as any;
    return user;
  }
}