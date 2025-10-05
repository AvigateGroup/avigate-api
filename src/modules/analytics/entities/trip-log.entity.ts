// src/modules/analytics/entities/trip-log.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('trip_logs')
export class TripLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column('uuid', { nullable: true })
  routeId: string;

  @Column('uuid', { nullable: true })
  startLocationId: string;

  @Column('uuid', { nullable: true })
  endLocationId: string;

  @Column({ type: 'timestamp' })
  @Index()
  tripStartedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  tripCompletedAt: Date;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  actualDuration: number; // minutes

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  totalFare: number;

  @Column({ default: false })
  wasSuccessful: boolean;

  @Column({ type: 'text', array: true, default: [] })
  transportModesUsed: string[];

  @Column({ type: 'jsonb', nullable: true })
  feedback: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
