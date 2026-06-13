import type { RecordActivityInput } from '@mitama/activity-log';
import { StockLocation } from '../../domain/stock-location.entity';
import type { StockLocationRepository } from '../../domain/stock-location.repository';
import { InventoryItem } from '../../domain/inventory-item.entity';
import type { InventoryItemFilter, InventoryItemPage, InventoryItemRepository } from '../../domain/inventory-item.repository';

export class InMemoryStockLocationRepository implements StockLocationRepository {
  readonly locations = new Map<string, StockLocation>();
  readonly activities: RecordActivityInput[] = [];

  async findById(id: string): Promise<StockLocation | null> {
    return this.locations.get(id) ?? null;
  }

  async findAll(): Promise<StockLocation[]> {
    return [...this.locations.values()];
  }

  async create(location: StockLocation, activity: RecordActivityInput): Promise<void> {
    this.locations.set(location.id, location);
    this.activities.push(activity);
  }

  async update(location: StockLocation, activity: RecordActivityInput): Promise<void> {
    this.locations.set(location.id, location);
    this.activities.push(activity);
  }
}

export class InMemoryInventoryItemRepository implements InventoryItemRepository {
  readonly items = new Map<string, InventoryItem>();
  readonly activities: RecordActivityInput[] = [];

  async findById(id: string): Promise<InventoryItem | null> {
    return this.items.get(id) ?? null;
  }

  async findByVariantId(variantId: string): Promise<InventoryItem | null> {
    for (const item of this.items.values()) {
      if (item.variantId === variantId) {
        return item;
      }
    }
    return null;
  }

  async findBySku(sku: string): Promise<InventoryItem | null> {
    for (const item of this.items.values()) {
      if (item.sku === sku) {
        return item;
      }
    }
    return null;
  }

  async findAll(filter: InventoryItemFilter): Promise<InventoryItemPage> {
    let items = [...this.items.values()];

    if (filter.search) {
      const search = filter.search.toLowerCase();
      items = items.filter(
        (item) => item.sku?.toLowerCase().includes(search) || item.title?.toLowerCase().includes(search),
      );
    }

    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const total = items.length;
    const start = (page - 1) * pageSize;

    return { items: items.slice(start, start + pageSize), total, page, pageSize };
  }

  async create(item: InventoryItem, activity: RecordActivityInput): Promise<void> {
    this.items.set(item.id, item);
    this.activities.push(activity);
  }

  async update(item: InventoryItem, activity: RecordActivityInput): Promise<void> {
    this.items.set(item.id, item);
    this.activities.push(activity);
  }

  async remove(item: InventoryItem, activity: RecordActivityInput): Promise<void> {
    this.items.delete(item.id);
    this.activities.push(activity);
  }
}
