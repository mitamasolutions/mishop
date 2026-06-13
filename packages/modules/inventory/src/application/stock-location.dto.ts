import type { StockLocation } from '../domain/stock-location.entity';

export interface StockLocationOutput {
  id: string;
  name: string;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export function toStockLocationOutput(location: StockLocation): StockLocationOutput {
  return {
    id: location.id,
    name: location.name,
    isActive: location.isActive,
    metadata: location.metadata,
    createdAt: location.createdAt.toISOString(),
    updatedAt: location.updatedAt.toISOString(),
  };
}
