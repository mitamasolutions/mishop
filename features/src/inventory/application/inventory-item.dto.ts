import type { InventoryItem, InventoryLevelProps } from '../domain/inventory-item.entity';

export interface InventoryLevelOutput {
  id: string;
  locationId: string;
  stockedQuantity: number;
  reservedQuantity: number;
  incomingQuantity: number;
  availableQuantity: number;
}

export interface InventoryItemOutput {
  id: string;
  sku: string | null;
  title: string | null;
  requiresShipping: boolean;
  variantId: string | null;
  requiredQuantity: number;
  metadata: Record<string, unknown> | null;
  levels: InventoryLevelOutput[];
  createdAt: string;
  updatedAt: string;
}

export function toInventoryLevelOutput(level: InventoryLevelProps): InventoryLevelOutput {
  return {
    id: level.id,
    locationId: level.locationId,
    stockedQuantity: level.stockedQuantity,
    reservedQuantity: level.reservedQuantity,
    incomingQuantity: level.incomingQuantity,
    availableQuantity: level.stockedQuantity - level.reservedQuantity,
  };
}

export function toInventoryItemOutput(item: InventoryItem): InventoryItemOutput {
  return {
    id: item.id,
    sku: item.sku,
    title: item.title,
    requiresShipping: item.requiresShipping,
    variantId: item.variantId,
    requiredQuantity: item.requiredQuantity,
    metadata: item.metadata,
    levels: item.levels.map(toInventoryLevelOutput),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
