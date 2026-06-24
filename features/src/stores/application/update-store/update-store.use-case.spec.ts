import { describe, expect, it, beforeEach } from 'vitest';
import type { RecordActivityInput } from '../../../activity-log';
import { Currency, Region, type CurrencyRepository, type RegionRepository } from '../../../reference-data';
import { ValidationError } from '@mitama/core';
import { UpdateStoreUseCase } from './update-store.use-case';
import { Store } from '../../domain/store.entity';
import { InvalidCurrencyError, InvalidRegionError, StoreNotFoundError } from '../../domain/errors';
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

class InMemoryCurrencyRepository implements CurrencyRepository {
  constructor(private readonly currencies: Currency[]) {}

  async findAll(): Promise<Currency[]> {
    return this.currencies;
  }

  async findByCode(code: string): Promise<Currency | null> {
    return this.currencies.find((currency) => currency.code === code) ?? null;
  }
}

class InMemoryRegionRepository implements RegionRepository {
  constructor(private readonly regions: Region[]) {}

  async findAll(): Promise<Region[]> {
    return this.regions;
  }

  async findById(id: string): Promise<Region | null> {
    return this.regions.find((region) => region.id === id) ?? null;
  }
}

describe('UpdateStoreUseCase', () => {
  let stores: InMemoryStoreRepository;
  let currencies: InMemoryCurrencyRepository;
  let regions: InMemoryRegionRepository;
  let useCase: UpdateStoreUseCase;
  let store: Store;

  beforeEach(async () => {
    stores = new InMemoryStoreRepository();
    currencies = new InMemoryCurrencyRepository([
      Currency.rehydrate('MXN', { symbol: '$', symbolNative: '$', decimalDigits: 2, rounding: 0, name: 'Peso mexicano' }),
      Currency.rehydrate('USD', { symbol: '$', symbolNative: '$', decimalDigits: 2, rounding: 0, name: 'Dólar estadounidense' }),
    ]);
    regions = new InMemoryRegionRepository([
      Region.rehydrate('mexico', { name: 'México', currencyCode: 'MXN', automaticTaxes: true }),
      Region.rehydrate('norteamerica', { name: 'Norteamérica', currencyCode: 'USD', automaticTaxes: false }),
    ]);
    useCase = new UpdateStoreUseCase(stores, currencies, regions);

    store = Store.create({ name: 'Tienda Demo', code: 'demo', url: null, currencyCode: 'MXN', regionId: 'mexico' });
    await stores.create(store, {
      userId: null,
      storeId: null,
      action: 'store.created',
      entityType: 'store',
      entityId: store.id,
    });
  });

  it('actualiza nombre y url, y registra la actividad', async () => {
    const result = await useCase.execute({
      id: store.id,
      name: 'Tienda Renombrada',
      url: 'https://renombrada.example',
      actorUserId: 'user-1',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.name).toBe('Tienda Renombrada');
      expect(result.value.url).toBe('https://renombrada.example');
    }
    expect(stores.activities.at(-1)?.action).toBe('store.updated');
  });

  it('actualiza moneda y región si son válidas', async () => {
    const result = await useCase.execute({
      id: store.id,
      currencyCode: 'USD',
      regionId: 'norteamerica',
      actorUserId: null,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.currencyCode).toBe('USD');
      expect(result.value.regionId).toBe('norteamerica');
    }
  });

  it('falla con StoreNotFoundError si la tienda no existe', async () => {
    const result = await useCase.execute({ id: 'nope', name: 'X', actorUserId: null });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(StoreNotFoundError);
    }
  });

  it('falla con ValidationError si el nombre queda vacío', async () => {
    const result = await useCase.execute({ id: store.id, name: '   ', actorUserId: null });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });

  it('falla con InvalidCurrencyError si la moneda no existe', async () => {
    const result = await useCase.execute({ id: store.id, currencyCode: 'XXX', actorUserId: null });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidCurrencyError);
    }
  });

  it('falla con InvalidRegionError si la región no existe', async () => {
    const result = await useCase.execute({ id: store.id, regionId: 'nowhere', actorUserId: null });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidRegionError);
    }
  });
});
