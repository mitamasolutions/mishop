import type { RecordActivityInput } from '../../activity-log';
import { StockLocation } from './stock-location.entity';

/**
 * Puerto de persistencia de ubicaciones de stock. infra/ lo implementa con
 * Prisma, escribiendo la mutación y `recordActivity(tx, activity)` en la
 * misma transacción.
 */
export interface StockLocationRepository {
  findById(id: string): Promise<StockLocation | null>;
  findAll(): Promise<StockLocation[]>;
  create(location: StockLocation, activity: RecordActivityInput): Promise<void>;
  update(location: StockLocation, activity: RecordActivityInput): Promise<void>;
}
