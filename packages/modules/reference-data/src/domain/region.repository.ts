import { Region } from './region.entity';

/** Puerto de solo lectura: las regiones se cargan por seed, sin CRUD por API. */
export interface RegionRepository {
  findAll(): Promise<Region[]>;
  findById(id: string): Promise<Region | null>;
}
