// src/modules/route/entities/route-segment.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Route } from './route.entity';
import { Location } from '../../location/entities/location.entity';

/**
 * RouteSegment represents a shared path between two locations
 * Example: Rumuokoro to Mile1 is a segment used by multiple routes
 */
@Entity('route_segments')
export class RouteSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g., "Rumuokoro to Mile1 via Ikwere Road "

  @Column('uuid')
  @Index()
  startLocationId: string;

  @Column('uuid')
  @Index()
  endLocationId: string;

  // Intermediate stops on this segment
  @Column({ type: 'jsonb', default: [] })
  intermediateStops: Array<{
    locationId?: string;
    name: string;
    order: number;
    isOptional: boolean; // Some stops are optional depending on driver
  }>;

  @Column({ type: 'simple-array' })
  transportModes: string[]; // ['bus', 'taxi']

  @Column('decimal', { precision: 10, scale: 2 })
  distance: number;

  @Column('decimal', { precision: 10, scale: 2 })
  estimatedDuration: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  minFare: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  maxFare: number;

  @Column({ type: 'text' })
  instructions: string;

  // Common landmarks along this segment
  @Column({ type: 'jsonb', default: [] })
  landmarks: string[];

  // How often this segment is used (popularity)
  @Column({ default: 0 })
  usageCount: number;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @Column({ default: false })
  @Index()
  isVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ADDED: Relations to Location entities
  @ManyToOne(() => Location)
  @JoinColumn({ name: 'startLocationId' })
  startLocation: Location;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'endLocationId' })
  endLocation: Location;

  @ManyToMany(() => Route, route => route.segments)
  routes: Route[];
}