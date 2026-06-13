import { apiFetch } from '../api-client';
import type { StoreOutput } from './types';

export function listStores(): Promise<StoreOutput[]> {
  return apiFetch<StoreOutput[]>('/stores');
}

export function getStore(id: string): Promise<StoreOutput> {
  return apiFetch<StoreOutput>(`/stores/${id}`);
}

export interface CreateStoreInput {
  name: string;
  code: string;
  url?: string;
  currencyCode: string;
  regionId: string;
}

export function createStore(input: CreateStoreInput): Promise<StoreOutput> {
  return apiFetch<StoreOutput>('/stores', { method: 'POST', body: input });
}

export interface UpdateStoreInput {
  name?: string;
  url?: string | null;
  currencyCode?: string;
  regionId?: string;
}

export function updateStore(id: string, input: UpdateStoreInput): Promise<StoreOutput> {
  return apiFetch<StoreOutput>(`/stores/${id}`, { method: 'PATCH', body: input });
}

export function setStoreStatus(id: string, isActive: boolean): Promise<StoreOutput> {
  return apiFetch<StoreOutput>(`/stores/${id}/status`, { method: 'PATCH', body: { isActive } });
}
