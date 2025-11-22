// src/modules/route/services/final-destination-handler.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouteSegment } from '../entities/route-segment.entity';
import { Location } from '../../location/entities/location.entity';
import { GoogleMapsService } from './google-maps.service';
import { GeofencingService } from './geofencing.service';
import { logger } from '@/utils/logger.util';

interface FinalDestinationResult {
  needsWalking: boolean;
  dropOffLocation: {
    name: string;
    coordinates: { lat: number; lng: number };
    landmark?: string;
  };
  walkingDirections?: {
    distance: number; // meters
    duration: number; // minutes
    steps: Array<{
      instruction: string;
      distance: number;
      duration: number;
    }>;
  };
  instructions: string;
  alternativeTransport?: {
    type: 'okada' | 'keke';
    estimatedFare: number;
    instructions: string;
  };
}

@Injectable()
export class FinalDestinationHandlerService {
  private readonly WALKING_THRESHOLD = 1000; // 1km - beyond this, suggest okada/keke

  constructor(
    @InjectRepository(RouteSegment)
    private segmentRepository: Repository<RouteSegment>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    private googleMapsService: GoogleMapsService,
    private geofencingService: GeofencingService,
  ) {}

  /**
   * Handle final destination that requires walking from main road
   * Example: Hotel in Kala Street when buses stop on Ikwerre Road
   */
  async handleFinalDestination(
    mainRoadLat: number,
    mainRoadLng: number,
    finalDestinationLat: number,
    finalDestinationLng: number,
    finalDestinationName: string,
    nearestLandmark?: string,
  ): Promise<FinalDestinationResult> {
    logger.info('Handling final destination', {
      finalDestination: finalDestinationName,
      nearestLandmark,
    });

    // Calculate distance from main road to final destination
    const walkingDistance = this.geofencingService.calculateDistance(
      { lat: mainRoadLat, lng: mainRoadLng },
      { lat: finalDestinationLat, lng: finalDestinationLng },
    );

    // If very close (< 50m), just give simple walking instruction
    if (walkingDistance < 50) {
      return {
        needsWalking: true,
        dropOffLocation: {
          name: nearestLandmark || 'your stop',
          coordinates: { lat: mainRoadLat, lng: mainRoadLng },
          landmark: nearestLandmark,
        },
        instructions: this.generateSimpleWalkingInstruction(
          finalDestinationName,
          nearestLandmark,
          walkingDistance,
        ),
      };
    }

    // Get detailed walking directions
    const walkingDirections = await this.googleMapsService.getDirections(
      { lat: mainRoadLat, lng: mainRoadLng },
      { lat: finalDestinationLat, lng: finalDestinationLng },
      'walking',
    );

    // Determine if okada/keke should be suggested
    const suggestAlternative = walkingDistance > this.WALKING_THRESHOLD;

    const result: FinalDestinationResult = {
      needsWalking: true,
      dropOffLocation: {
        name: nearestLandmark || 'the main road',
        coordinates: { lat: mainRoadLat, lng: mainRoadLng },
        landmark: nearestLandmark,
      },
      walkingDirections: {
        distance: walkingDirections.distance * 1000, // convert to meters
        duration: walkingDirections.duration,
        steps: walkingDirections.steps.map(step => ({
          instruction: step.instruction,
          distance: step.distance * 1000,
          duration: step.duration,
        })),
      },
      instructions: this.generateDetailedWalkingInstructions(
        finalDestinationName,
        nearestLandmark,
        walkingDirections,
        suggestAlternative,
      ),
    };

    // Add alternative transport if distance is significant
    if (suggestAlternative) {
      result.alternativeTransport = {
        type: walkingDistance > 2000 ? 'keke' : 'okada',
        estimatedFare: this.estimateLocalTransportFare(walkingDistance),
        instructions: this.generateAlternativeTransportInstructions(
          finalDestinationName,
          nearestLandmark,
          walkingDistance,
        ),
      };
    }

    return result;
  }

  /**
   * Find best drop-off point on main road near final destination
   */
  async findBestDropOffPoint(
    segmentId: string,
    finalDestinationLat: number,
    finalDestinationLng: number,
  ): Promise<{
    dropOffName: string;
    dropOffLat: number;
    dropOffLng: number;
    landmark?: string;
  } | null> {
    const segment = await this.segmentRepository.findOne({
      where: { id: segmentId },
    });

    if (!segment || !segment.landmarks || segment.landmarks.length === 0) {
      return null;
    }

    let closestLandmark: string | null = null;
    let minDistance = Infinity;

    // Check each landmark to find closest to final destination
    for (const landmark of segment.landmarks) {
      // Geocode landmark
      const landmarkCoords = await this.googleMapsService.geocode(
        `${landmark}, Port Harcourt, Rivers State, Nigeria`,
      );

      if (!landmarkCoords) continue;

      const distance = this.geofencingService.calculateDistance(
        { lat: finalDestinationLat, lng: finalDestinationLng },
        landmarkCoords,
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestLandmark = landmark;
      }
    }

    if (!closestLandmark) {
      // Use segment end location
      const endLocation = await this.locationRepository.findOne({
        where: { id: segment.endLocationId },
      });

      if (!endLocation) return null;

      return {
        dropOffName: endLocation.name,
        dropOffLat: Number(endLocation.latitude),
        dropOffLng: Number(endLocation.longitude),
      };
    }

    // Geocode the closest landmark
    const dropOffCoords = await this.googleMapsService.geocode(
      `${closestLandmark}, Port Harcourt, Rivers State, Nigeria`,
    );

    if (!dropOffCoords) return null;

    return {
      dropOffName: closestLandmark,
      dropOffLat: dropOffCoords.lat,
      dropOffLng: dropOffCoords.lng,
      landmark: closestLandmark,
    };
  }

  /**
   * Generate simple walking instruction for very short distances
   */
  private generateSimpleWalkingInstruction(
    destination: string,
    landmark: string | undefined,
    distance: number,
  ): string {
    const distanceText = `${Math.round(distance)}m`;
    const landmarkText = landmark ? ` near ${landmark}` : '';

    return `
**Final Step: Short Walk to ${destination}**

Drop off at${landmarkText}, then ${destination} is just ${distanceText} away - very close!

**What to Do:**
1. Tell the driver: "I dey drop here"
2. Ask locals: "Where ${destination} dey?" (they'll point you)
3. It's walking distance - you'll see it

**Tip:** Use Avigate's "Walk" button for turn-by-turn directions if needed.
    `.trim();
  }

  /**
   * Generate detailed walking instructions
   */
  private generateDetailedWalkingInstructions(
    destination: string,
    landmark: string | undefined,
    walkingDirections: any,
    suggestAlternative: boolean,
  ): string {
    const distanceKm = walkingDirections.distance;
    const durationMin = Math.round(walkingDirections.duration);
    const distanceText =
      distanceKm >= 1 ? `${distanceKm.toFixed(1)}km` : `${Math.round(distanceKm * 1000)}m`;

    const landmarkText = landmark ? ` after ${landmark}` : '';

    const alternativeText = suggestAlternative
      ? `\n\n**Alternative: Use Okada/Keke**\n- Walking ${distanceText} may be tiring\n- Okada (motorcycle) or Keke can take you directly\n- Cost: ₦${this.estimateLocalTransportFare(distanceKm * 1000)} - ₦${this.estimateLocalTransportFare(distanceKm * 1000) + 100}\n- Just tell them: "Take me go ${destination}"`
      : '';

    return `
**Final Step: Walking to ${destination}**

Drop off on the main road${landmarkText}, then walk ${distanceText} to ${destination} (about ${durationMin} minutes).

**At Drop-Off Point:**
1. Tell the driver: "Driver, stop${landmarkText}!"
2. Pay your fare
3. Cross to the appropriate side if needed
4. Follow walking directions below

**Walking Directions:**
${walkingDirections.steps.map((step: any, i: number) => `${i + 1}. ${step.instruction} (${Math.round(step.distance)}m)`).join('\n')}

**What to Look For:**
- Use Avigate's "Walk" button for real-time turn-by-turn directions
- You can also ask locals: "Where ${destination} dey?"
- Most locals know the area and will help point you in the right direction
${alternativeText}
    `.trim();
  }

  /**
   * Generate alternative transport instructions
   */
  private generateAlternativeTransportInstructions(
    destination: string,
    landmark: string | undefined,
    distance: number,
  ): string {
    const transportType = distance > 2000 ? 'Keke' : 'Okada';
    const fare = this.estimateLocalTransportFare(distance);
    const landmarkText = landmark ? ` near ${landmark}` : '';

    return `
**Easier Option: Use ${transportType} from Drop-Off**

After dropping on the main road${landmarkText}:

**What to Do:**
1. Look for ${transportType} riders
2. Tell them: "Take me go ${destination}"
3. Agree on fare first (should be around ₦${fare} - ₦${fare + 100})
4. They'll take you directly to ${destination}

**Why This Is Better:**
- Saves ${Math.round((distance / 1000) * 12)} minutes of walking
- No need to navigate streets yourself
- Comfortable, especially if carrying bags

**Safety Tips:**
- Only board at designated stops
- Agree on price before boarding
- Keep your belongings secure
    `.trim();
  }

  /**
   * Estimate fare for okada/keke based on distance
   */
  private estimateLocalTransportFare(distanceMeters: number): number {
    // Base fare: ₦100
    // Additional: ₦50 per 500m
    const baseFare = 100;
    const additionalDistance = Math.max(0, distanceMeters - 500);
    const additionalFare = Math.ceil(additionalDistance / 500) * 50;

    return Math.min(baseFare + additionalFare, 500); // Cap at ₦500
  }

  /**
   * Extract street name from address
   */
  async extractStreetInfo(
    lat: number,
    lng: number,
  ): Promise<{ street?: string; area?: string } | null> {
    const address = await this.googleMapsService.reverseGeocode(lat, lng);

    if (!address) return null;

    // Parse address for street and area
    // Example: "Kala Street, Rumuobiakani, Port Harcourt"
    const parts = address.split(',').map(p => p.trim());

    return {
      street: parts[0], // First part is usually street
      area: parts[1], // Second part is usually area
    };
  }
}
