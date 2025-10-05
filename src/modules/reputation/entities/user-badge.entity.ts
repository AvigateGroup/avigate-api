// src/modules/reputation/entities/user-badge.entity.ts
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
import { Badge } from './badge.entity';

@Entity('user_badges')
export class UserBadge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column('uuid')
  @Index()
  badgeId: string;

  @Column({ type: 'timestamp' })
  earnedAt: Date;

  @Column({ default: false })
  isDisplayed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Badge)
  @JoinColumn({ name: 'badgeId' })
  badge: Badge;
}
