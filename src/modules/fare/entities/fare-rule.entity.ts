// src/modules/fare/entities/fare-rule.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('fare_rules')
export class FareRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  @Index()
  city: string;

  @Column()
  transportMode: string;

  @Column('decimal', { precision: 5, scale: 2 })
  multiplier: number; // For percentage adjustments

  @Column({ type: 'date' })
  @Index()
  effectiveFrom: Date;

  @Column({ type: 'date', nullable: true })
  effectiveTo: Date;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @Column('uuid')
  createdBy: string;

  @Column('uuid', { nullable: true })
  lastModifiedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
