// src/utils/fare.util.ts

/**
 * Nigerian transport fares are always in multiples of 50 naira
 * This utility rounds fares to the nearest 50
 */

/**
 * Round a fare to the nearest 50 naira
 * @param fare - The fare amount to round
 * @returns The fare rounded to nearest 50
 */
export function roundToNearest50(fare: number): number {
  if (!fare || fare <= 0) return 0;
  return Math.round(fare / 50) * 50;
}

/**
 * Round a fare down to the nearest 50 naira (for minimum fares)
 * @param fare - The fare amount to round
 * @returns The fare rounded down to nearest 50
 */
export function floorToNearest50(fare: number): number {
  if (!fare || fare <= 0) return 0;
  return Math.floor(fare / 50) * 50;
}

/**
 * Round a fare up to the nearest 50 naira (for maximum fares)
 * @param fare - The fare amount to round
 * @returns The fare rounded up to nearest 50
 */
export function ceilToNearest50(fare: number): number {
  if (!fare || fare <= 0) return 0;
  return Math.ceil(fare / 50) * 50;
}

/**
 * Calculate and round min/max fare range
 * @param minFare - The minimum fare
 * @param maxFare - The maximum fare
 * @returns Object with rounded min and max fares
 */
export function roundFareRange(minFare: number, maxFare: number): { min: number; max: number } {
  return {
    min: floorToNearest50(minFare),
    max: ceilToNearest50(maxFare),
  };
}
