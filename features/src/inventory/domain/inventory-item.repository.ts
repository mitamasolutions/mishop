import type { RecordActivityInput } from '../../activity-log';
import { InventoryItem } from './inventory-item.entity';

export interface InventoryItemFilter {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface InventoryItemPage {
  items: InventoryItem[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Puerto de persistencia de ítems de inventario. infra/ lo implementa con
 * Prisma, escribiendo la mutación y `recordActivity(tx, activity)` en la
 * misma transacción.
 */
export interface InventoryItemRepository {
  findById(id: string): Promise<InventoryItem | null>;
  findByVariantId(variantId: string): Promise<InventoryItem | null>;
  findBySku(sku: string): Promise<InventoryItem | null>;
  findAll(filter: InventoryItemFilter): Promise<InventoryItemPage>;
  create(item: InventoryItem, activity: RecordActivityInput): Promise<void>;
  update(item: InventoryItem, activity: RecordActivityInput): Promise<void>;
  remove(item: InventoryItem, activity: RecordActivityInput): Promise<void>;
}
