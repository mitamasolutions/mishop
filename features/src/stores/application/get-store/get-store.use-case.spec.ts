import { describe, expect, it, beforeEach } from 'vitest';
import type { RecordActivityInput } from '@mitama/activity-log';
import { GetStoreUseCase } from './get-store.use-case';
import { Store } from '../../domain/store.entity';
import { StoreNotFoundError } from '../../domain/errors';
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

describe('GetStoreUseCase', () => {
  let stores: InMemoryStoreRepository;
  let useCase: GetStoreUseCase;
  let store: Store;

  beforeEach(async () => {
    stores = new InMemoryStoreRepository();
    useCase = new GetStoreUseCase(stores);
    store = Store.create({ name: 'Tienda Demo', code: 'demo', url: null, currencyCode: 'MXN', regionId: 'mexico' });
    await stores.create(store, { userId: null, storeId: null, action: 'store.created', entityType: 'store', entityId: store.id });
  });

  it('retorna la tienda si existe', async () => {
    const result = await useCase.execute(store.id);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.id).toBe(store.id);
    }
  });

  it('falla con StoreNotFoundError si no existe', async () => {
    const result = await useCase.execute('nope');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(StoreNotFoundError);
    }
  });
});
