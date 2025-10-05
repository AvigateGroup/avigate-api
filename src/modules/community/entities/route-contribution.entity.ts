// src/modules/community/entities/route-contribution.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ContributionStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  IMPLEMENTED = 'implemented',
}

@Entity('route_contributions')
export class RouteContribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  contributorId: string;

  @Column()
  contributionType: string; // new_route, route_update, fare_correction

  @Column('uuid', { nullable: true })
  routeId: string;

  @Column('uuid', { nullable: true })
  startLocationId: string;

  @Column('uuid', { nullable: true })
  endLocationId: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb' })
  proposedData: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ContributionStatus,
    default: ContributionStatus.PENDING,
  })
  @Index()
  status: ContributionStatus;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string;

  @Column('uuid', { nullable: true })
  reviewedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column('uuid', { nullable: true })
  implementedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  implementedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
