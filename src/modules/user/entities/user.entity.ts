// src/modules/user/entities/user.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserDevice } from './user-device.entity';
import { UserOTP } from './user-otp.entity';

export enum UserSex {
  MALE = 'male',
  FEMALE = 'female',
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
  })
  @Index()
  sex: UserSex;

  @Column({ unique: true })
  @Index()
  phoneNumber: string;

  @Column({ nullable: true, unique: true })
  @Index()
  googleId: string;

  @Column({ nullable: true, select: false })
  passwordHash: string;

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

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  lastLoginAt: Date;

  @Column({ type: 'text', nullable: true, select: false })
  refreshToken: string;

  @Column({ type: 'timestamp', nullable: true })
  refreshTokenExpiresAt: Date;

  @Column({ nullable: true, select: false })
  passwordResetToken: string;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpiresAt: Date;

  @Column({ default: 100 })
  @Index()
  reputationScore: number;

  @Column({ default: 0 })
  totalContributions: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => UserDevice, device => device.user)
  devices: UserDevice[];

  @OneToMany(() => UserOTP, otp => otp.user)
  otps: UserOTP[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.passwordHash && !this.passwordHash.startsWith('$2')) {
      const salt = await bcrypt.genSalt(12);
      this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    }
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    if (!this.passwordHash) return false;
    return bcrypt.compare(candidatePassword, this.passwordHash);
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  toJSON() {
    const { passwordHash, refreshToken, passwordResetToken, ...user } = this as any;
    return user;
  }
}
