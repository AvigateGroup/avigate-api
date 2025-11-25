// src/modules/route/dto/route-response.dto.ts

export interface WalkingDirections {
  distance: number; // meters
  duration: number; // minutes
  steps: Array<{
    instruction: string;
    distance: number; // meters
    duration: number; // minutes
  }>;
}

export interface AlternativeTransport {
  type: 'okada' | 'keke';
  estimatedFare: number;
  instructions: string;
}

export interface DataAvailability {
  hasVehicleData: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
}

export interface AlternativeOptions {
  askLocals: boolean;
  localPhrases: string[];
  walkable: boolean;
}

export interface EnhancedRouteStep {
  order: number;
  fromLocation: string;
  toLocation: string;
  transportMode: 'bus' | 'taxi' | 'keke' | 'okada' | 'walk';
  instructions: string;
  duration: number;
  distance: number;
  estimatedFare?: number;
  
  // NEW: Data availability indicator
  dataAvailability: DataAvailability;
  
  walkingDirections?: WalkingDirections;
  alternativeTransport?: AlternativeTransport;
  
  // NEW: Alternative options for when no vehicle data
  alternativeOptions?: AlternativeOptions;
}

export interface EnhancedRoute {
  routeId?: string;
  routeName: string;
  source: 'database' | 'google_maps' | 'intermediate_stop' | 'with_walking';
  distance: number;
  duration: number;
  minFare?: number;
  maxFare?: number;
  steps: EnhancedRouteStep[];
  confidence: number;
  requiresWalking?: boolean;
  finalDestinationInfo?: {
    needsWalking: boolean;
    dropOffLocation: any;
    walkingDirections?: WalkingDirections;
    alternativeTransport?: AlternativeTransport;
  };
}