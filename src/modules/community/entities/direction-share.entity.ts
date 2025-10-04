// src/modules/community/entities/direction-share.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('direction_shares')
export class DirectionShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  createdBy: string;

  @Column('uuid', { nullable: true })
  startLocationId: string;

  @Column('uuid', { nullable: true })
  endLocationId: string;

  @Column({ unique: true })
  @Index()
  shareToken: string;

  @Column({ type: 'text', nullable: true })
  customInstructions: string;

  @Column({ type: 'jsonb', nullable: true })
  routePreferences: Record<string, any>;

  @Column({ default: 0 })
  accessCount: number;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ default: 'active' })
  @Index()
  status: string; // active, expired, revoked

  @Column('uuid', { nullable: true })
  lastAccessedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
