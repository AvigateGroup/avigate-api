// src/modules/route/entities/route.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
  Index,
} from 'typeorm';
import { Location } from '../../location/entities/location.entity';
import { RouteStep } from './route-step.entity';
import { RouteSegment } from './route-segment.entity';
import { TransportMode } from '../enums/transport-mode.enum';

@Entity('routes')
export class Route {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  startLocationId: string;

  @Column('uuid')
  @Index()
  endLocationId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TransportMode,
    array: true,
    default: [],
  })
  transportModes: TransportMode[];

  @Column('decimal', { precision: 10, scale: 2 })
  estimatedDuration: number; // minutes

  @Column('decimal', { precision: 10, scale: 2 })
  distance: number; // kilometers

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  minFare: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  maxFare: number;

  @Column({ default: 0 })
  popularityScore: number;

  @Column({ default: false })
  @Index()
  isVerified: boolean;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @Column('uuid', { nullable: true })
  createdBy: string;

  @Column('uuid', { nullable: true })
  verifiedBy: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'startLocationId' })
  startLocation: Location;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'endLocationId' })
  endLocation: Location;

  @OneToMany(() => RouteStep, step => step.route)
  steps: RouteStep[];

  // ADDED: Missing inverse relation for RouteSegment
  @ManyToMany(() => RouteSegment, segment => segment.routes)
  @JoinTable({
    name: 'route_segments_mapping',
    joinColumn: { name: 'routeId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'segmentId', referencedColumnName: 'id' },
  })
  segments: RouteSegment[];
}
