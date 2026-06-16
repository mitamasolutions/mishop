import { Region } from '../domain/region.entity';
import type { RegionRepository } from '../domain/region.repository';
import type { RecordActivityInput } from '../../activity-log';

export class InMemoryRegionRepository implements RegionRepository {
  readonly regions: Region[];
  readonly recordedActivity: RecordActivityInput[] = [];

  constructor(regions: Region[] = []) {
    this.regions = regions;
  }

  async findAll(): Promise<Region[]> {
    return this.regions.filter((r) => r.isActive);
  }

  async findById(id: string): Promise<Region | null> {
    return this.regions.find((r) => r.id === id) ?? null;
  }

  async findByIdWithDetails(id: string): Promise<Region | null> {
    return this.regions.find((r) => r.id === id) ?? null;
  }

  async save(region: Region, activity: RecordActivityInput): Promise<void> {
    const idx = this.regions.findIndex((r) => r.id === region.id);
    if (idx >= 0) {
      this.regions[idx] = region;
    } else {
      this.regions.push(region);
    }
    this.recordedActivity.push(activity);
  }

  async softDelete(id: string, activity: RecordActivityInput): Promise<void> {
    const idx = this.regions.findIndex((r) => r.id === id);
    if (idx >= 0) {
      const region = this.regions[idx];
      if (region) this.regions[idx] = region.deactivate();
    }
    this.recordedActivity.push(activity);
  }

  async hasActiveDependencies(_id: string): Promise<boolean> {
    return false;
  }
}
