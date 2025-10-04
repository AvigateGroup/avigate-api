// src/modules/fare/entities/fare-history.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('fare_histories')
export class FareHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  routeId: string;

  @Column('uuid', { nullable: true })
  routeStepId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  minFare: number;

  @Column('decimal', { precision: 10, scale: 2 })
  maxFare: number;

  @Column('decimal', { precision: 10, scale: 2 })
  avgFare: number;

  @Column()
  transportMode: string;

  @Column({ type: 'date' })
  @Index()
  effectiveDate: Date;

  @Column('uuid', { nullable: true })
  createdBy: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}