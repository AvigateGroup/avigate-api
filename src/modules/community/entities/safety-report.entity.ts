// src/modules/community/entities/safety-report.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SafetyLevel {
  SAFE = 'safe',
  CAUTION = 'caution',
  UNSAFE = 'unsafe',
  DANGEROUS = 'dangerous',
}

@Entity('safety_reports')
export class SafetyReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  reportedBy: string;

  @Column('uuid', { nullable: true })
  @Index()
  locationId: string;

  @Column('uuid', { nullable: true })
  routeId: string;

  @Column({
    type: 'enum',
    enum: SafetyLevel,
  })
  safetyLevel: SafetyLevel;

  @Column()
  incidentType: string; // theft, harassment, accident, etc.

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'timestamp' })
  incidentDate: Date;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: 'open' })
  @Index()
  status: string; // open, investigating, resolved

  @Column('uuid', { nullable: true })
  verifiedBy: string;

  @Column('uuid', { nullable: true })
  resolvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
