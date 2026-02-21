// src/modules/journey/entities/journey.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Route } from '../../route/entities/route.entity';
import { JourneyLeg } from './journey-leg.entity';

export type JourneyStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

@Entity('journeys')
export class Journey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  routeId?: string;

  @ManyToOne(() => Route, { nullable: true })
  @JoinColumn({ name: 'routeId' })
  route?: Route;

  // Journey details
  @Column({ type: 'varchar', length: 255 })
  startLocation: string;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  startLatitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  startLongitude: number;

  @Column({ type: 'varchar', length: 255 })
  endLocation: string;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  endLatitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  endLongitude: number;

  @Column({ type: 'text', nullable: true })
  endLandmark?: string;

  // Journey status
  @Column({
    type: 'enum',
    enum: ['planned', 'in_progress', 'completed', 'cancelled'],
    default: 'planned',
  })
  status: JourneyStatus;

  // Journey legs (segments)
  @OneToMany(() => JourneyLeg, leg => leg.journey, { cascade: true })
  legs: JourneyLeg[];

  // Timing
  @Column({ type: 'timestamp', nullable: true })
  plannedStartTime?: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualStartTime?: Date;

  @Column({ type: 'timestamp', nullable: true })
  plannedEndTime?: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualEndTime?: Date;

  // Estimates
  @Column({ type: 'int' })
  estimatedDuration: number; // minutes

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  estimatedDistance: number; // km

  @Column({ type: 'int' })
  estimatedMinFare: number;

  @Column({ type: 'int' })
  estimatedMaxFare: number;

  // Tracking
  @Column({ type: 'boolean', default: false })
  trackingEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  notificationsEnabled: boolean;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
