// src/modules/admin/entities/admin.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  ANALYST = 'analyst',
}

@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: AdminRole,
    default: AdminRole.ADMIN,
  })
  @Index()
  role: AdminRole;

  @Column({ type: 'json', default: [] })
  permissions: string[];

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @Column({ type: 'json', nullable: true, select: false })
  passwordHistory: string[];

  @Column({ default: false })
  mustChangePassword: boolean;

  @Column({ type: 'timestamp', nullable: true })
  passwordChangedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  lastLoginIP: string;

  @Column({ type: 'text', nullable: true })
  lastUserAgent: string;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil: Date | null;

  @Column({ type: 'text', nullable: true, select: false })
  refreshToken: string;

  @Column({ type: 'timestamp', nullable: true })
  refreshTokenExpiresAt: Date | null;

  // Password Reset Token Fields
  @Column({ type: 'varchar', nullable: true, select: false })
  resetToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpiry: Date | null;

  // Admin Invitation Token Fields
  @Column({ type: 'varchar', nullable: true, select: false })
  inviteToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  inviteTokenExpiry: Date | null;

  @Column({ nullable: true, select: false })
  totpSecret: string | null;

  @Column({ default: false })
  totpEnabled: boolean;

  @Column({ type: 'json', nullable: true, select: false })
  totpBackupCodes: string[] | null;

  @Column('uuid', { nullable: true })
  createdBy: string;

  @Column('uuid', { nullable: true })
  lastModifiedBy: string;

  @Column('uuid', { nullable: true })
  deletedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  @Index()
  deletedAt: Date;

  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  creator: Admin;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.passwordHash && !this.passwordHash.startsWith('$2')) {
      const salt = await bcrypt.genSalt(12);
      this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    }
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.passwordHash);
  }

  generateTOTPSecret() {
    const secret = speakeasy.generateSecret({
      name: `Avigate Admin (${this.email})`,
      issuer: 'Avigate',
      length: 32,
    });
    this.totpSecret = secret.base32;
    return secret;
  }

  verifyTOTP(token: string): boolean {
    if (!this.totpSecret || !this.totpEnabled) return false;
    return speakeasy.totp.verify({
      secret: this.totpSecret,
      encoding: 'base32',
      token,
      window: 2,
    });
  }

  hasPermission(permission: string): boolean {
    if (this.role === AdminRole.SUPER_ADMIN) return true;
    return this.permissions.includes(permission);
  }

  toJSON() {
    const {
      passwordHash,
      totpSecret,
      totpBackupCodes,
      refreshToken,
      passwordHistory,
      resetToken,
      inviteToken,
      ...admin
    } = this as any;
    return admin;
  }
}
