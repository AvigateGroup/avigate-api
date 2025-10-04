// src/modules/fare/entities/fare-feedback.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('fare_feedbacks')
export class FareFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column('uuid', { nullable: true })
  @Index()
  routeId: string;

  @Column('uuid', { nullable: true })
  routeStepId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  farePaid: number;

  @Column()
  transportMode: string;

  @Column({ type: 'text', nullable: true })
  additionalNotes: string;

  @Column({ default: false })
  @Index()
  isVerified: boolean;

  @Column('uuid', { nullable: true })
  reportedBy: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
