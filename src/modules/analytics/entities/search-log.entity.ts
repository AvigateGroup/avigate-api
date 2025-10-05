// src/modules/analytics/entities/search-log.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('search_logs')
export class SearchLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  @Index()
  userId: string;

  @Column()
  searchQuery: string;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  userLat: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  userLng: number;

  @Column({ nullable: true })
  resultCount: number;

  @Column({ default: false })
  wasSuccessful: boolean;

  @Column({ type: 'jsonb', nullable: true })
  filters: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
