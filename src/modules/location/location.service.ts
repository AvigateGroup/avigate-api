// src/modules/location/location.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Location } from './entities/location.entity';
import { Landmark } from './entities/landmark.entity';
import { CreateLocationDto } from './dto/create-location.dto';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    @InjectRepository(Landmark)
    private landmarkRepository: Repository<Landmark>,
  ) {}

  async createLocation(createLocationDto: CreateLocationDto, userId?: string) {
    const location = this.locationRepository.create({
      ...createLocationDto,
      isVerified: false,
      isActive: true,
      popularityScore: 0,
    });

    return await this.locationRepository.save(location);
  }

  async searchLocations(query: string, city?: string) {
    const where: any = {
      isActive: true,
      name: Like(`%${query}%`),
    };

    if (city) {
      where.city = city;
    }

    const locations = await this.locationRepository.find({
      where,
      take: 20,
      order: { popularityScore: 'DESC' },
    });

    return {
      success: true,
      data: { locations },
    };
  }

  async getNearbyLocations(lat: number, lng: number, radiusKm: number = 5) {
    // Haversine formula for nearby locations
    const locations = await this.locationRepository
      .createQueryBuilder('location')
      .where('location.isActive = :isActive', { isActive: true })
      .andWhere(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(latitude)) * cos(radians(longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(latitude)))) < :radius`,
        { lat, lng, radius: radiusKm },
      )
      .orderBy('location.popularityScore', 'DESC')
      .limit(50)
      .getMany();

    return {
      success: true,
      data: { locations, count: locations.length },
    };
  }

  async getLocationById(id: string) {
    const location = await this.locationRepository.findOne({
      where: { id, isActive: true },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    const landmarks = await this.landmarkRepository.find({
      where: { locationId: id, isVerified: true },
    });

    return {
      success: true,
      data: { location, landmarks },
    };
  }

  async getPopularLocations(city?: string, limit: number = 20) {
    const where: any = { isActive: true };
    if (city) where.city = city;

    const locations = await this.locationRepository.find({
      where,
      order: { popularityScore: 'DESC' },
      take: limit,
    });

    return {
      success: true,
      data: { locations },
    };
  }
}
