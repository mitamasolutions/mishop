import type { RecordActivityInput } from '../../activity-log';
import { Zone } from './zone.entity';

export interface ZoneRepository {
  findById(id: string): Promise<Zone | null>;
  findByTerritoryId(territoryId: string): Promise<Zone[]>;
  findByCodeAndTerritoryId(code: string, territoryId: string): Promise<Zone | null>;
  save(zone: Zone, activity: RecordActivityInput): Promise<void>;
  softDelete(id: string, activity: RecordActivityInput): Promise<void>;
}
