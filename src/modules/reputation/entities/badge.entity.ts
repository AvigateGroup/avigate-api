// src/modules/reputation/entities/badge.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// Define or import the ReputationAction type/interface
export type ReputationAction = 'post' | 'comment' | 'like' | 'share'; // Adjust as needed

@Entity('badges')
export class Badge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  iconUrl: string;

  @Column()
  tier: string; // bronze, silver, gold, platinum

  @Column({ type: 'jsonb' })
  requirements: {
    type: 'reputation' | 'action_count' | 'special';
    value: number;
    action?: ReputationAction;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
