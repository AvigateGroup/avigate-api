// src/modules/route/services/google-maps.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, DirectionsRequest, TravelMode } from '@googlemaps/google-maps-services-js';
import { logger } from '@/utils/logger.util';

export interface GoogleRouteResponse {
  distance: number; // in kilometers
  duration: number; // in minutes
  polyline: string;
  steps: Array<{
    instruction: string;
    distance: number;
    duration: number;
    startLocation: { lat: number; lng: number };
    endLocation: { lat: number; lng: number };
  }>;
}

@Injectable()
export class GoogleMapsService {
  private client: Client;
  private apiKey: string;

  constructor(private configService: ConfigService) {
    this.client = new Client({});
    
    const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY is not configured');
    }
    this.apiKey = apiKey;
  }

  async getDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: 'driving' | 'walking' | 'transit' = 'transit',
  ): Promise<GoogleRouteResponse> {
    try {
      const request: DirectionsRequest = {
        params: {
          origin: `${origin.lat},${origin.lng}`,
          destination: `${destination.lat},${destination.lng}`,
          mode: mode === 'transit' ? TravelMode.transit : mode === 'walking' ? TravelMode.walking : TravelMode.driving,
          key: this.apiKey,
          alternatives: false,
        },
      };

      const response = await this.client.directions(request);

      if (response.data.status !== 'OK' || !response.data.routes.length) {
        throw new Error(`Google Maps API error: ${response.data.status}`);
      }

      const route = response.data.routes[0];
      const leg = route.legs[0];

      return {
        distance: leg.distance.value / 1000, // convert meters to km
        duration: leg.duration.value / 60, // convert seconds to minutes
        polyline: route.overview_polyline.points,
        steps: leg.steps.map(step => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // strip HTML
          distance: step.distance.value / 1000,
          duration: step.duration.value / 60,
          startLocation: {
            lat: step.start_location.lat,
            lng: step.start_location.lng,
          },
          endLocation: {
            lat: step.end_location.lat,
            lng: step.end_location.lng,
          },
        })),
      };
    } catch (error) {
      logger.error('Google Maps API error:', error);
      throw error;
    }
  }

  async geocode(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const response = await this.client.geocode({
        params: {
          address,
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK' || !response.data.results.length) {
        return null;
      }

      const location = response.data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    } catch (error) {
      logger.error('Geocoding error:', error);
      return null;
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      const response = await this.client.reverseGeocode({
        params: {
          latlng: `${lat},${lng}`,
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK' || !response.data.results.length) {
        return null;
      }

      return response.data.results[0].formatted_address;
    } catch (error) {
      logger.error('Reverse geocoding error:', error);
      return null;
    }
  }

  async getDistanceMatrix(
    origins: Array<{ lat: number; lng: number }>,
    destinations: Array<{ lat: number; lng: number }>,
  ): Promise<number[][]> {
    try {
      const response = await this.client.distancematrix({
        params: {
          origins: origins.map(o => `${o.lat},${o.lng}`),
          destinations: destinations.map(d => `${d.lat},${d.lng}`),
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Distance Matrix API error: ${response.data.status}`);
      }

      return response.data.rows.map(row =>
        row.elements.map(element => (element.distance ? element.distance.value / 1000 : Infinity)),
      );
    } catch (error) {
      logger.error('Distance Matrix API error:', error);
      throw error;
    }
  }
}