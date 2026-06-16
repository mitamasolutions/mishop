import type { RecordActivityInput } from '@mitama/activity-log';
import { Store } from './store.entity';

/**
 * Puerto de persistencia de tiendas. infra/ lo implementa con Prisma,
 * escribiendo la mutación y `recordActivity(tx, activity)` en la misma
 * transacción (si falla el log, falla la mutación).
 */
export interface StoreRepository {
  findById(id: string): Promise<Store | null>;
  findByCode(code: string): Promise<Store | null>;
  findAll(): Promise<Store[]>;
  create(store: Store, activity: RecordActivityInput): Promise<void>;
  update(store: Store, activity: RecordActivityInput): Promise<void>;
}
