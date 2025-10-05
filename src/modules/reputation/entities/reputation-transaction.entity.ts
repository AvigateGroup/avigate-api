// src/modules/reputation/entities/reputation-transaction.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum ReputationAction {
  FARE_FEEDBACK = 'fare_feedback',
  ROUTE_CONTRIBUTION = 'route_contribution',
  SAFETY_REPORT = 'safety_report',
  COMMUNITY_POST = 'community_post',
  HELPFUL_REVIEW = 'helpful_review',
  VERIFIED_CONTRIBUTION = 'verified_contribution',
  DIRECTION_SHARE = 'direction_share',
  COMPLETE_TRIP = 'complete_trip',
  PENALTY_SPAM = 'penalty_spam',
  PENALTY_INACCURATE = 'penalty_inaccurate',
}

@Entity('reputation_transactions')
export class ReputationTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: ReputationAction,
  })
  @Index()
  action: ReputationAction;

  @Column()
  points: number; // Can be positive or negative

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column('uuid', { nullable: true })
  relatedEntityId: string; // ID of feedback, contribution, etc.

  @Column({ nullable: true })
  relatedEntityType: string; // 'fare_feedback', 'route_contribution', etc.

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
