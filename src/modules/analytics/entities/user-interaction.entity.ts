// src/modules/analytics/entities/user-interaction.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_interactions')
export class UserInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column()
  @Index()
  interactionType: string; // view_route, share_direction, rate_trip, etc.

  @Column('uuid', { nullable: true })
  targetId: string; // ID of the thing being interacted with

  @Column({ nullable: true })
  targetType: string; // route, location, post, etc.

  @Column({ type: 'jsonb', nullable: true })
  interactionData: Record<string, any>;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}