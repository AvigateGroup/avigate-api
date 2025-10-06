// src/modules/route/entities/active-trip.entity.ts
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
import { User } from '../../user/entities/user.entity';
import { Route } from './route.entity';
import { RouteStep } from './route-step.entity';
import { Location } from '../../location/entities/location.entity';

export enum TripStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Define interfaces for complex types
interface LocationHistoryItem {
  lat: number;
  lng: number;
  timestamp: string;
  accuracy?: number;
}

interface StepProgressItem {
  startedAt: string;
  completedAt?: string;
  farePaid?: number;
  notes?: string;
}

@Entity('active_trips')
export class ActiveTrip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column('uuid', { nullable: true })
  routeId: string;

  @Column('uuid', { nullable: true })
  currentStepId: string;

  @Column('uuid', { nullable: true })
  startLocationId: string;

  @Column('uuid', { nullable: true })
  endLocationId: string;

  // Current user location
  @Column('decimal', { precision: 10, scale: 7 })
  currentLat: number;

  @Column('decimal', { precision: 10, scale: 7 })
  currentLng: number;

  // Trip details
  @Column({
    type: 'enum',
    enum: TripStatus,
    default: TripStatus.PLANNING,
  })
  @Index()
  status: TripStatus;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  estimatedArrival: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  // Tracking
  @Column({ type: 'jsonb', nullable: true })
  locationHistory: LocationHistoryItem[];

  @Column({ type: 'jsonb', nullable: true })
  stepProgress: Record<string, StepProgressItem>;

  // Notifications sent
  @Column({ type: 'jsonb', default: {} })
  notificationsSent: Record<string, boolean>;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Route)
  @JoinColumn({ name: 'routeId' })
  route: Route;

  @ManyToOne(() => RouteStep, { nullable: true })
  @JoinColumn({ name: 'currentStepId' })
  currentStep: RouteStep;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'startLocationId' })
  startLocation: Location;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'endLocationId' })
  endLocation: Location;
}