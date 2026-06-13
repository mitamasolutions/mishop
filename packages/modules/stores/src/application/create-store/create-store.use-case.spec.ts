import { describe, expect, it, beforeEach } from 'vitest';
import type { RecordActivityInput } from '@mitama/activity-log';
import { Currency, Region, type CurrencyRepository, type RegionRepository } from '@mitama/reference-data';
import { ValidationError } from '@mitama/core';
import { CreateStoreUseCase } from './create-store.use-case';
import { Store } from '../../domain/store.entity';
import { StoreCodeAlreadyInUseError, InvalidCurrencyError, InvalidRegionError } from '../../domain/errors';
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

describe('CreateStoreUseCase', () => {
  let stores: InMemoryStoreRepository;
  let currencies: InMemoryCurrencyRepository;
  let regions: InMemoryRegionRepository;
  let useCase: CreateStoreUseCase;

  beforeEach(() => {
    stores = new InMemoryStoreRepository();
    currencies = new InMemoryCurrencyRepository([
      Currency.rehydrate('MXN', { symbol: '$', symbolNative: '$', decimalDigits: 2, rounding: 0, name: 'Peso mexicano' }),
    ]);
    regions = new InMemoryRegionRepository([
      Region.rehydrate('mexico', { name: 'México', currencyCode: 'MXN', automaticTaxes: true }),
    ]);
    useCase = new CreateStoreUseCase(stores, currencies, regions);
  });

  it('crea una tienda y registra la actividad', async () => {
    const result = await useCase.execute({
      name: 'Tienda Demo',
      code: 'DEMO',
      currencyCode: 'MXN',
      regionId: 'mexico',
      actorUserId: 'user-1',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.code).toBe('demo');
      expect(result.value.isActive).toBe(true);
    }
    expect(stores.activities).toHaveLength(1);
    expect(stores.activities[0]?.action).toBe('store.created');
  });

  it('falla con ValidationError si el nombre está vacío', async () => {
    const result = await useCase.execute({
      name: '  ',
      code: 'DEMO',
      currencyCode: 'MXN',
      regionId: 'mexico',
      actorUserId: null,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });

  it('falla con StoreCodeAlreadyInUseError si el código ya existe', async () => {
    await useCase.execute({
      name: 'Tienda Demo',
      code: 'demo',
      currencyCode: 'MXN',
      regionId: 'mexico',
      actorUserId: null,
    });

    const result = await useCase.execute({
      name: 'Otra Tienda',
      code: 'DEMO',
      currencyCode: 'MXN',
      regionId: 'mexico',
      actorUserId: null,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(StoreCodeAlreadyInUseError);
    }
  });

  it('falla con InvalidCurrencyError si la moneda no existe', async () => {
    const result = await useCase.execute({
      name: 'Tienda Demo',
      code: 'DEMO',
      currencyCode: 'XXX',
      regionId: 'mexico',
      actorUserId: null,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidCurrencyError);
    }
  });

  it('falla con InvalidRegionError si la región no existe', async () => {
    const result = await useCase.execute({
      name: 'Tienda Demo',
      code: 'DEMO',
      currencyCode: 'MXN',
      regionId: 'nowhere',
      actorUserId: null,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidRegionError);
    }
  });
});
