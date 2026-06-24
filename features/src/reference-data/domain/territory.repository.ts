import type { RecordActivityInput } from '../../activity-log';
import { Territory } from './territory.entity';

export interface TerritoryRepository {
  findById(id: string): Promise<Territory | null>;
  findByRegionId(regionId: string): Promise<Territory[]>;
  findByCodeAndRegionId(code: string, regionId: string): Promise<Territory | null>;
  save(territory: Territory, activity: RecordActivityInput): Promise<void>;
  softDelete(id: string, activity: RecordActivityInput): Promise<void>;
  /** True si el territorio tiene zonas activas. */
  hasActiveZones(id: string): Promise<boolean>;
}
