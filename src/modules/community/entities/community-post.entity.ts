// src/modules/community/entities/community-post.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Location } from '../../location/entities/location.entity';

export enum PostType {
  TRAFFIC_UPDATE = 'traffic_update',
  ROUTE_ALERT = 'route_alert',
  SAFETY_CONCERN = 'safety_concern',
  TIP = 'tip',
  GENERAL = 'general',
}

@Entity('community_posts')
export class CommunityPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  authorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({
    type: 'enum',
    enum: PostType,
  })
  @Index()
  postType: PostType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column('uuid', { nullable: true })
  @Index()
  locationId: string;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'locationId' })
  location: Location;

  @Column('uuid', { nullable: true })
  routeId: string;

  @Column({ type: 'text', array: true, default: [] })
  images: string[];

  @Column({ default: 0 })
  upvotes: number;

  @Column({ default: 0 })
  downvotes: number;

  @Column({ default: false })
  @Index()
  isVerified: boolean;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @Column('uuid', { nullable: true })
  verifiedBy: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
