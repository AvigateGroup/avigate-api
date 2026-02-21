// src/modules/journey/entities/journey-leg.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Journey } from './journey.entity';
import { RouteSegment } from '../../route/entities/route-segment.entity';

export type LegStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

@Entity('journey_legs')
export class JourneyLeg {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  journeyId: string;

  @ManyToOne(() => Journey, journey => journey.legs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'journeyId' })
  journey: Journey;

  @Column({ type: 'uuid' })
  segmentId: string;

  @ManyToOne(() => RouteSegment)
  @JoinColumn({ name: 'segmentId' })
  segment: RouteSegment;

  // Leg order in journey
  @Column({ type: 'int' })
  order: number;

  // Leg details
  @Column({ type: 'varchar', length: 50 })
  transportMode: string;

  @Column({ type: 'int' })
  estimatedDuration: number; // minutes

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  distance: number; // km

  @Column({ type: 'int' })
  minFare: number;

  @Column({ type: 'int' })
  maxFare: number;

  // Status
  @Column({
    type: 'enum',
    enum: ['pending', 'in_progress', 'completed', 'skipped'],
    default: 'pending',
  })
  status: LegStatus;

  // Timing
  @Column({ type: 'timestamp', nullable: true })
  actualStartTime?: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualEndTime?: Date;

  // Transfer information
  @Column({ type: 'boolean', default: false })
  isTransferRequired: boolean;

  @Column({ type: 'text', nullable: true })
  transferInstructions?: string;

  @Column({ type: 'int', nullable: true })
  estimatedTransferWaitTime?: number; // minutes

  // Notification tracking
  @Column({ type: 'boolean', default: false })
  transferAlertSent: boolean;

  @Column({ type: 'boolean', default: false })
  transferImminentSent: boolean;

  @Column({ type: 'boolean', default: false })
  destinationAlertSent: boolean;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
