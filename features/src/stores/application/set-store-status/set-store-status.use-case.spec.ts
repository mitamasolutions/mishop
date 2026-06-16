import { describe, expect, it, beforeEach } from 'vitest';
import type { RecordActivityInput } from '../../../activity-log';
import { SetStoreStatusUseCase } from './set-store-status.use-case';
import { Store } from '../../domain/store.entity';
import { StoreNotFoundError } from '../../domain/errors';
import type { StoreRepository } from '../../domain/store.repository';

class InMemoryStoreRepository implements StoreRepository {
  readonly stores = new Map<string, Store>();
  readonly activities: RecordActivityInput[] = [];

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

  async create(store: Store, activity: RecordActivityInput): Promise<void> {
    this.stores.set(store.id, store);
    this.activities.push(activity);
  }

  async update(store: Store, activity: RecordActivityInput): Promise<void> {
    this.stores.set(store.id, store);
    this.activities.push(activity);
  }
}

describe('SetStoreStatusUseCase', () => {
  let stores: InMemoryStoreRepository;
  let useCase: SetStoreStatusUseCase;
  let store: Store;

  beforeEach(async () => {
    stores = new InMemoryStoreRepository();
    useCase = new SetStoreStatusUseCase(stores);
    store = Store.create({ name: 'Tienda Demo', code: 'demo', url: null, currencyCode: 'MXN', regionId: 'mexico' });
    await stores.create(store, {
      userId: null,
      storeId: null,
      action: 'store.created',
      entityType: 'store',
      entityId: store.id,
    });
  });

  it('desactiva una tienda activa', async () => {
    const result = await useCase.execute({ id: store.id, isActive: false, actorUserId: 'user-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.isActive).toBe(false);
    }
    expect(stores.activities.at(-1)?.action).toBe('store.deactivated');
  });

  it('reactiva una tienda desactivada', async () => {
    await useCase.execute({ id: store.id, isActive: false, actorUserId: null });
    const result = await useCase.execute({ id: store.id, isActive: true, actorUserId: null });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.isActive).toBe(true);
    }
    expect(stores.activities.at(-1)?.action).toBe('store.activated');
  });

  it('falla con StoreNotFoundError si la tienda no existe', async () => {
    const result = await useCase.execute({ id: 'nope', isActive: false, actorUserId: null });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(StoreNotFoundError);
    }
  });
});
