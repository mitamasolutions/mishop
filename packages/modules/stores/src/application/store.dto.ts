import type { Store } from '../domain/store.entity';

export interface StoreOutput {
  id: string;
  name: string;
  code: string;
  url: string | null;
  currencyCode: string;
  regionId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toStoreOutput(store: Store): StoreOutput {
  return {
    id: store.id,
    name: store.name,
    code: store.code,
    url: store.url,
    currencyCode: store.currencyCode,
    regionId: store.regionId,
    isActive: store.isActive,
    createdAt: store.createdAt.toISOString(),
    updatedAt: store.updatedAt.toISOString(),
  };
}
