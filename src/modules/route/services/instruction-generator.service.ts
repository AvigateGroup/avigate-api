// src/modules/route/services/instruction-generator.service.ts
import { Injectable } from '@nestjs/common';

export interface StreetInfo {
  street?: string;
  area?: string;
}

@Injectable()
export class InstructionGeneratorService {
  /**
   * Extract street information from address
   */
  extractStreetInfo(address: string | null): StreetInfo {
    if (!address) return {};

    const parts = address.split(',').map(p => p.trim());

    return {
      street: parts[0],
      area: parts[1],
    };
  }

  /**
   * Enhance instructions with drop-off landmark
   */
  enhanceInstructionsWithDropOff(instructions: string, dropOffName: string): string {
    return `${instructions}

**Your Drop-Off Point: ${dropOffName}**
Tell the driver to stop at ${dropOffName}. This is where you'll walk from to reach your final destination.`;
  }

  /**
   * Generate enhanced last-mile instructions with honest communication
   */
  generateEnhancedLastMileInstructions(
    dropOffPoint: string,
    landmarkBefore: string | undefined,
    destination: string,
    streetInfo: StreetInfo,
    distanceMeters: number,
    walkingDirections: any,
  ): string {
    const landmarkText = landmarkBefore ? ` after ${landmarkBefore}` : '';
    const streetText = streetInfo.street ? ` on ${streetInfo.street}` : '';
    const walkingMin = Math.ceil(walkingDirections.duration);

    if (distanceMeters <= 200) {
      return `
**Final Step: Direct to ${destination}**

Great news! ${destination} is on the main road - drivers know this area well!

**Tell the Driver:**
"Driver, I dey go ${destination}${streetText}"
${landmarkBefore ? `OR "Driver, stop for ${landmarkBefore}"` : ''}

**What Happens:**
- Driver will take you directly there
- No need to walk - ${destination} is visible from the road
- Distance: ${Math.round(distanceMeters)}m from ${dropOffPoint}

**Real-time Notifications:**
- Avigate will alert you when you're approaching
- You'll get "Tell driver now!" notification at the right time
- Just relax and let us guide you!

**Data Availability: HIGH**
This location is on a known route with regular vehicle service.
    `.trim();
    }

    if (distanceMeters <= 800) {
      return `
**Final Step: Getting to ${destination}${streetText}**

Drop off at ${dropOffPoint}${landmarkText}. ${destination} is ${Math.round(distanceMeters)}m away (about ${walkingMin} minutes walk).

**At ${dropOffPoint}:**
1. Tell driver: "Driver, stop${landmarkText}!"
2. Pay your fare

**Note:** Avigate doesn't have data on vehicles going into ${streetInfo.street || 'this street'}.

**Your Options:**

**Option 1 - Ask Locals (Recommended):**
Look around for keke, okada, or taxi entering the street. Ask:
- "Which motor dey go ${destination}${streetText}?"
- "You fit carry me go ${destination}?"

Locals know the area best!

**Option 2 - Walk:**
- ${Math.round(distanceMeters)}m (about ${walkingMin} minutes)
- Tap "Walk" button below for turn-by-turn directions

**Walking Preview:**
${walkingDirections.steps
  .slice(0, 3)
  .map((s: any, i: number) => `${i + 1}. ${s.instruction}`)
  .join('\n')}

**Data Availability: LOW**
Side street - local knowledge recommended
    `.trim();
    }

    const estimatedFare = this.calculateLastMileFare(distanceMeters);

    return `
**Final Step: Getting to ${destination}${streetText}**

Drop off at ${dropOffPoint}${landmarkText}. ${destination} is ${Math.round(distanceMeters)}m away.

**At ${dropOffPoint}:**
1. Tell driver: "Driver, stop${landmarkText}!"
2. Pay your fare

**Note:** Avigate doesn't have data on vehicles going into ${streetInfo.street || 'this area'}.

**What to Do:**

**1. Look Around:**
Check for keke or okada entering the street

**2. Ask for Help:**
- "Which motor dey go ${destination}${streetText}?"
- "You fit carry me go ${destination}?"
- Expected fare: ₦${estimatedFare - 50} - ₦${estimatedFare + 50}

**3. If No Vehicle Available - Walk:**
- ${walkingMin} minutes
- Tap "Walk" button below for step-by-step guidance

**Walking Preview:**
${walkingDirections.steps
  .slice(0, 3)
  .map((s: any, i: number) => `${i + 1}. ${s.instruction}`)
  .join('\n')}

**Remember:** Locals know shortcuts Avigate doesn't! Don't hesitate to ask for help.

**Data Availability: LOW**
Side street - local knowledge recommended
    `.trim();
  }

  /**
   * Generate instructions for destinations WITH vehicle data
   */
  generateDirectNavigationInstructions(
    dropOffPoint: string,
    destination: string,
    streetInfo: StreetInfo,
    distanceMeters: number,
    vehicleTypes: ('bus' | 'taxi' | 'keke' | 'okada')[],
  ): string {
    const streetText = streetInfo.street ? ` on ${streetInfo.street}` : '';
    const vehicleText = vehicleTypes.join(' or ');

    return `
**Final Step: Direct to ${destination}**

Good news! ${vehicleText.toUpperCase()} service available to ${destination}!

**At ${dropOffPoint}:**
Look for ${vehicleText} going into ${streetInfo.street || 'the street'}

**Tell the Driver/Rider:**
"I dey go ${destination}${streetText}"

**What to Expect:**
- ${vehicleText} will take you directly there
- Distance: ${Math.round(distanceMeters)}m from ${dropOffPoint}
- Duration: ~${Math.ceil(distanceMeters / 200)} minutes

**Real-time Guidance:**
- Avigate will notify you when approaching
- Just relax and let us guide you!

**Data Availability: HIGH**
Regular ${vehicleText} service confirmed for this location.
  `.trim();
  }

  /**
   * Build street-level instructions
   */
  buildStreetLevelInstructions(
    mainRoadStop: string,
    destination: string,
    streetInfo: StreetInfo,
    distance: number,
    walkingDirections: any,
    landmark: string | null,
  ): string {
    return this.generateEnhancedLastMileInstructions(
      mainRoadStop,
      landmark || undefined,
      destination,
      streetInfo,
      distance,
      walkingDirections,
    );
  }

  /**
   * Calculate last mile fare
   */
  private calculateLastMileFare(distanceMeters: number): number {
    const baseFare = 100;
    const perMeterRate = 0.1;
    const calculatedFare = baseFare + distanceMeters * perMeterRate;
    return Math.min(500, Math.max(100, Math.round(calculatedFare / 50) * 50));
  }
}