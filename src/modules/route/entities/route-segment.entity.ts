// src/modules/route/entities/route-segment.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Location } from '../../location/entities/location.entity';

export interface IntermediateStop {
  locationId?: string;
  name: string;
  order: number;
  isOptional: boolean;
}

export interface VehicleServiceInfo {
  serviceType: 'main_road' | 'side_street' | 'residential';
  hasRegularService: boolean;
  vehicleTypes: ('bus' | 'taxi' | 'keke' | 'okada')[];
  frequency?: 'high' | 'medium' | 'low';
  operatingHours?: {
    start: string;
    end: string;
  };
}

@Entity('route_segments')
@Index(['startLocationId', 'endLocationId'])
@Index(['isActive', 'isVerified'])
@Index(['isBidirectional', 'isActive']) 
export class RouteSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'uuid' })
  startLocationId: string;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'startLocationId' })
  startLocation?: Location;

  @Column({ type: 'uuid' })
  endLocationId: string;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'endLocationId' })
  endLocation?: Location;

  @Column({ type: 'jsonb', nullable: true })
  intermediateStops: IntermediateStop[];

  @Column({ type: 'simple-array' })
  transportModes: string[];

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  distance: number;

  @Column({ type: 'int' })
  estimatedDuration: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minFare?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxFare?: number;

  @Column({ type: 'text' })
  instructions: string;

  @Column({ type: 'jsonb', nullable: true })
  landmarks?: Array<{ name: string; lat: number; lng: number }>;

  @Column({ type: 'jsonb', nullable: true })
  vehicleService?: VehicleServiceInfo;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  //NEW: Bidirectional support fields
  @Column({ type: 'boolean', default: true })
  isBidirectional: boolean;

  @Column({ type: 'int', default: 0 })
  reversedUsageCount: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}