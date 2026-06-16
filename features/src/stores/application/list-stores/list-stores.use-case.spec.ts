import { describe, expect, it, beforeEach } from 'vitest';
import type { RecordActivityInput } from '../../../activity-log';
import { ListStoresUseCase } from './list-stores.use-case';
import { Store } from '../../domain/store.entity';
import type { StoreRepository } from '../../domain/store.repository';

class InMemoryStoreRepository implements StoreRepository {
  readonly stores = new Map<string, Store>();

  async findById(id: string): Promise<Store | null> {
    return this.stores.get(id) ?? null;
  }

  async findByCode(code: string): Promise<Store | null> {
    for (const store of this.stores.values()) {
      if (store.code === code) {
        return store;
      }
    }
    return null;
  }

  async findAll(): Promise<Store[]> {
    return [...this.stores.values()];
  }

  async create(store: Store, _activity: RecordActivityInput): Promise<void> {
    this.stores.set(store.id, store);
  }

  async update(store: Store, _activity: RecordActivityInput): Promise<void> {
    this.stores.set(store.id, store);
  }
}

describe('ListStoresUseCase', () => {
  let stores: InMemoryStoreRepository;
  let useCase: ListStoresUseCase;

  beforeEach(() => {
    stores = new InMemoryStoreRepository();
    useCase = new ListStoresUseCase(stores);
  });

  it('lista las tiendas existentes', async () => {
    await stores.create(
      Store.create({ name: 'Tienda 1', code: 'uno', url: null, currencyCode: 'MXN', regionId: 'mexico' }),
      { userId: null, storeId: null, action: 'store.created', entityType: 'store', entityId: 'x' },
    );
    await stores.create(
      Store.create({ name: 'Tienda 2', code: 'dos', url: null, currencyCode: 'MXN', regionId: 'mexico' }),
      { userId: null, storeId: null, action: 'store.created', entityType: 'store', entityId: 'y' },
    );

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(2);
      expect(result.value.map((store) => store.code).sort()).toEqual(['dos', 'uno']);
    }
  });

  it('retorna lista vacía si no hay tiendas', async () => {
    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual([]);
    }
  });
});
