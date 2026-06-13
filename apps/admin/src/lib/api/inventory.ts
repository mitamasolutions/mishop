import { apiFetch } from '../api-client';
import type { InventoryItemOutput, ListInventoryItemsOutput, StockLocationOutput } from './types';

// ----- Ubicaciones de stock -----

export function listStockLocations(): Promise<StockLocationOutput[]> {
  return apiFetch<StockLocationOutput[]>('/inventory/locations');
}

export interface CreateStockLocationInput {
  name: string;
  metadata?: Record<string, unknown> | null;
}

export function createStockLocation(input: CreateStockLocationInput): Promise<StockLocationOutput> {
  return apiFetch<StockLocationOutput>('/inventory/locations', { method: 'POST', body: input });
}

export interface UpdateStockLocationInput {
  name?: string;
  metadata?: Record<string, unknown> | null;
}

export function updateStockLocation(id: string, input: UpdateStockLocationInput): Promise<StockLocationOutput> {
  return apiFetch<StockLocationOutput>(`/inventory/locations/${id}`, { method: 'PATCH', body: input });
}

export function setStockLocationStatus(id: string, isActive: boolean): Promise<StockLocationOutput> {
  return apiFetch<StockLocationOutput>(`/inventory/locations/${id}/status`, { method: 'PATCH', body: { isActive } });
}

// ----- Ítems de inventario -----

export interface ListInventoryItemsFilter {
  search?: string;
  page?: number;
  pageSize?: number;
}

export function listInventoryItems(filter: ListInventoryItemsFilter = {}): Promise<ListInventoryItemsOutput> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return apiFetch<ListInventoryItemsOutput>(`/inventory/items${query ? `?${query}` : ''}`);
}

export function getInventoryItem(id: string): Promise<InventoryItemOutput> {
  return apiFetch<InventoryItemOutput>(`/inventory/items/${id}`);
}

export function getInventoryItemByVariant(variantId: string): Promise<InventoryItemOutput> {
  return apiFetch<InventoryItemOutput>(`/inventory/items/by-variant/${variantId}`);
}

export interface CreateInventoryItemInput {
  sku?: string | null;
  title?: string | null;
  requiresShipping?: boolean;
  variantId?: string | null;
  requiredQuantity?: number;
  metadata?: Record<string, unknown> | null;
}

export function createInventoryItem(input: CreateInventoryItemInput): Promise<InventoryItemOutput> {
  return apiFetch<InventoryItemOutput>('/inventory/items', { method: 'POST', body: input });
}

export interface UpdateInventoryItemInput {
  sku?: string | null;
  title?: string | null;
  requiresShipping?: boolean;
}

export function updateInventoryItem(id: string, input: UpdateInventoryItemInput): Promise<InventoryItemOutput> {
  return apiFetch<InventoryItemOutput>(`/inventory/items/${id}`, { method: 'PATCH', body: input });
}

export interface SetInventoryLevelInput {
  stockedQuantity?: number;
  incomingQuantity?: number;
}

export function setInventoryLevel(itemId: string, locationId: string, input: SetInventoryLevelInput): Promise<InventoryItemOutput> {
  return apiFetch<InventoryItemOutput>(`/inventory/items/${itemId}/levels/${locationId}`, { method: 'PUT', body: input });
}

export function removeInventoryLevel(itemId: string, locationId: string): Promise<InventoryItemOutput> {
  return apiFetch<InventoryItemOutput>(`/inventory/items/${itemId}/levels/${locationId}`, { method: 'DELETE' });
}
