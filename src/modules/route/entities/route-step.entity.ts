// src/modules/route/entities/route-step.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Route, TransportMode } from './route.entity';
import { Location } from '../../location/entities/location.entity';

@Entity('route_steps')
export class RouteStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  routeId: string;

  @Column()
  stepOrder: number;

  @Column('uuid', { nullable: true })
  fromLocationId: string;

  @Column('uuid', { nullable: true })
  toLocationId: string;

  @Column({
    type: 'enum',
    enum: TransportMode,
  })
  transportMode: TransportMode;

  @Column({ type: 'text' })
  instructions: string;

  @Column('decimal', { precision: 10, scale: 2 })
  duration: number; // minutes

  @Column('decimal', { precision: 10, scale: 2 })
  distance: number; // kilometers

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  estimatedFare: number;

  @Column({ type: 'text', nullable: true })
  vehicleInfo: string; // e.g., "Yellow bus to Oshodi"

  @Column({ type: 'jsonb', nullable: true })
  landmarks: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Route, route => route.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'routeId' })
  route: Route;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'fromLocationId' })
  fromLocation: Location;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'toLocationId' })
  toLocation: Location;
}