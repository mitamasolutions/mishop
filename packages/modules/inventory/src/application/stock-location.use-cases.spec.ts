import { beforeEach, describe, expect, it } from 'vitest';
import { ValidationError } from '@mitama/core';
import { CreateStockLocationUseCase } from './create-stock-location/create-stock-location.use-case';
import { UpdateStockLocationUseCase } from './update-stock-location/update-stock-location.use-case';
import { SetStockLocationStatusUseCase } from './set-stock-location-status/set-stock-location-status.use-case';
import { ListStockLocationsUseCase } from './list-stock-locations/list-stock-locations.use-case';
import { StockLocationNotFoundError } from '../domain/errors';
import { InMemoryStockLocationRepository } from './test-support/in-memory-repositories';

describe('CreateStockLocationUseCase', () => {
  let locations: InMemoryStockLocationRepository;
  let useCase: CreateStockLocationUseCase;

  beforeEach(() => {
    locations = new InMemoryStockLocationRepository();
    useCase = new CreateStockLocationUseCase(locations);
  });

  it('crea una ubicación de stock y registra la actividad', async () => {
    const result = await useCase.execute({ name: 'Almacén central', actorUserId: 'user-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.name).toBe('Almacén central');
      expect(result.value.isActive).toBe(true);
    }
    expect(locations.activities).toHaveLength(1);
    expect(locations.activities[0]?.action).toBe('inventory.location.created');
  });

  it('falla con ValidationError si el nombre está vacío', async () => {
    const result = await useCase.execute({ name: '  ', actorUserId: null });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });
});

describe('UpdateStockLocationUseCase', () => {
  let locations: InMemoryStockLocationRepository;
  let useCase: UpdateStockLocationUseCase;

  beforeEach(() => {
    locations = new InMemoryStockLocationRepository();
    useCase = new UpdateStockLocationUseCase(locations);
  });

  it('actualiza el nombre de una ubicación', async () => {
    const create = await new CreateStockLocationUseCase(locations).execute({ name: 'Almacén central', actorUserId: null });
    if (!create.isOk()) throw new Error('setup falló');
    const id = create.value.id;

    const result = await useCase.execute({ id, name: 'Almacén norte', actorUserId: 'user-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.name).toBe('Almacén norte');
    }
  });

  it('falla con StockLocationNotFoundError si la ubicación no existe', async () => {
    const result = await useCase.execute({ id: 'nope', name: 'X', actorUserId: null });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(StockLocationNotFoundError);
    }
  });

  it('falla con ValidationError si el nombre queda vacío', async () => {
    const create = await new CreateStockLocationUseCase(locations).execute({ name: 'Almacén central', actorUserId: null });
    if (!create.isOk()) throw new Error('setup falló');
    const id = create.value.id;

    const result = await useCase.execute({ id, name: '  ', actorUserId: null });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });
});

describe('SetStockLocationStatusUseCase / ListStockLocationsUseCase', () => {
  let locations: InMemoryStockLocationRepository;

  beforeEach(() => {
    locations = new InMemoryStockLocationRepository();
  });

  it('activa y desactiva una ubicación', async () => {
    const create = await new CreateStockLocationUseCase(locations).execute({ name: 'Almacén central', actorUserId: null });
    if (!create.isOk()) throw new Error('setup falló');
    const id = create.value.id;

    const result = await new SetStockLocationStatusUseCase(locations).execute({ id, isActive: false, actorUserId: 'user-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.isActive).toBe(false);
    }
  });

  it('falla con StockLocationNotFoundError si la ubicación no existe', async () => {
    const result = await new SetStockLocationStatusUseCase(locations).execute({ id: 'nope', isActive: false, actorUserId: null });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(StockLocationNotFoundError);
    }
  });

  it('lista todas las ubicaciones', async () => {
    await new CreateStockLocationUseCase(locations).execute({ name: 'Almacén central', actorUserId: null });
    await new CreateStockLocationUseCase(locations).execute({ name: 'Tienda norte', actorUserId: null });

    const result = await new ListStockLocationsUseCase(locations).execute();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(2);
    }
  });
});
