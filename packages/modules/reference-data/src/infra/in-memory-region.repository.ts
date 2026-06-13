import { Region } from '../domain/region.entity';
import type { RegionRepository } from '../domain/region.repository';

export class InMemoryRegionRepository implements RegionRepository {
  constructor(private readonly regions: Region[] = []) {}

  async findAll(): Promise<Region[]> {
    return [...this.regions];
  }

  async findById(id: string): Promise<Region | null> {
    return this.regions.find((region) => region.id === id) ?? null;
  }
}
