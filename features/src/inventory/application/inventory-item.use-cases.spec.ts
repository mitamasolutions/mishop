import { beforeEach, describe, expect, it } from 'vitest';
import { ValidationError } from '@mitama/core';
import { CreateInventoryItemUseCase } from './create-inventory-item/create-inventory-item.use-case';
import { UpdateInventoryItemUseCase } from './update-inventory-item/update-inventory-item.use-case';
import { GetInventoryItemUseCase } from './get-inventory-item/get-inventory-item.use-case';
import { GetInventoryItemByVariantUseCase } from './get-inventory-item-by-variant/get-inventory-item-by-variant.use-case';
import { ListInventoryItemsUseCase } from './list-inventory-items/list-inventory-items.use-case';
import { SetInventoryLevelUseCase } from './set-inventory-level/set-inventory-level.use-case';
import { RemoveInventoryLevelUseCase } from './remove-inventory-level/remove-inventory-level.use-case';
import { CreateStockLocationUseCase } from './create-stock-location/create-stock-location.use-case';
import {
  InvalidQuantityError,
  InventoryItemNotFoundError,
  InventoryItemSkuAlreadyInUseError,
  InventoryLevelNotFoundError,
  StockLocationNotFoundError,
  VariantAlreadyLinkedError,
} from '../domain/errors';
import { InMemoryInventoryItemRepository, InMemoryStockLocationRepository } from './test-support/in-memory-repositories';

describe('CreateInventoryItemUseCase', () => {
  let items: InMemoryInventoryItemRepository;
  let useCase: CreateInventoryItemUseCase;

  beforeEach(() => {
    items = new InMemoryInventoryItemRepository();
    useCase = new CreateInventoryItemUseCase(items);
  });

  it('crea un ítem de inventario y registra la actividad', async () => {
    const result = await useCase.execute({ sku: 'SKU-001', title: 'Camiseta M', actorUserId: 'user-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.sku).toBe('SKU-001');
      expect(result.value.levels).toEqual([]);
    }
    expect(items.activities).toHaveLength(1);
    expect(items.activities[0]?.action).toBe('inventory.item.created');
  });

  it('falla con InventoryItemSkuAlreadyInUseError si el SKU ya está en uso', async () => {
    await useCase.execute({ sku: 'SKU-001', actorUserId: null });

    const result = await useCase.execute({ sku: 'SKU-001', actorUserId: null });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InventoryItemSkuAlreadyInUseError);
    }
  });

  it('falla con VariantAlreadyLinkedError si la variante ya tiene un ítem vinculado', async () => {
    await useCase.execute({ variantId: 'variant-1', actorUserId: null });

    const result = await useCase.execute({ variantId: 'variant-1', actorUserId: null });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(VariantAlreadyLinkedError);
    }
  });

  it('falla con ValidationError si la cantidad requerida es menor a 1', async () => {
    const result = await useCase.execute({ requiredQuantity: 0, actorUserId: null });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });
});

describe('UpdateInventoryItemUseCase', () => {
  let items: InMemoryInventoryItemRepository;
  let useCase: UpdateInventoryItemUseCase;

  beforeEach(() => {
    items = new InMemoryInventoryItemRepository();
    useCase = new UpdateInventoryItemUseCase(items);
  });

  it('actualiza el título y SKU de un ítem', async () => {
    const create = await new CreateInventoryItemUseCase(items).execute({ sku: 'SKU-001', actorUserId: null });
    if (!create.isOk()) throw new Error('setup falló');
    const id = create.value.id;

    const result = await useCase.execute({ id, sku: 'SKU-002', title: 'Nuevo título', actorUserId: 'user-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.sku).toBe('SKU-002');
      expect(result.value.title).toBe('Nuevo título');
    }
  });

  it('falla con InventoryItemNotFoundError si el ítem no existe', async () => {
    const result = await useCase.execute({ id: 'nope', title: 'X', actorUserId: null });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InventoryItemNotFoundError);
    }
  });

  it('falla con InventoryItemSkuAlreadyInUseError si el nuevo SKU ya está en uso', async () => {
    await new CreateInventoryItemUseCase(items).execute({ sku: 'SKU-001', actorUserId: null });
    const create = await new CreateInventoryItemUseCase(items).execute({ sku: 'SKU-002', actorUserId: null });
    if (!create.isOk()) throw new Error('setup falló');
    const id = create.value.id;

    const result = await useCase.execute({ id, sku: 'SKU-001', actorUserId: null });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InventoryItemSkuAlreadyInUseError);
    }
  });
});

describe('GetInventoryItemUseCase / GetInventoryItemByVariantUseCase / ListInventoryItemsUseCase', () => {
  let items: InMemoryInventoryItemRepository;

  beforeEach(() => {
    items = new InMemoryInventoryItemRepository();
  });

  it('obtiene un ítem por id', async () => {
    const create = await new CreateInventoryItemUseCase(items).execute({ sku: 'SKU-001', actorUserId: null });
    if (!create.isOk()) throw new Error('setup falló');
    const id = create.value.id;

    const result = await new GetInventoryItemUseCase(items).execute(id);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.id).toBe(id);
    }
  });

  it('falla con InventoryItemNotFoundError si no existe', async () => {
    const result = await new GetInventoryItemUseCase(items).execute('nope');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InventoryItemNotFoundError);
    }
  });

  it('obtiene un ítem por variantId', async () => {
    const create = await new CreateInventoryItemUseCase(items).execute({ variantId: 'variant-1', actorUserId: null });
    if (!create.isOk()) throw new Error('setup falló');

    const result = await new GetInventoryItemByVariantUseCase(items).execute('variant-1');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.variantId).toBe('variant-1');
    }
  });

  it('falla con InventoryItemNotFoundError si la variante no tiene ítem vinculado', async () => {
    const result = await new GetInventoryItemByVariantUseCase(items).execute('nope');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InventoryItemNotFoundError);
    }
  });

  it('lista los ítems con paginación', async () => {
    await new CreateInventoryItemUseCase(items).execute({ sku: 'SKU-001', title: 'Camiseta', actorUserId: null });
    await new CreateInventoryItemUseCase(items).execute({ sku: 'SKU-002', title: 'Pantalón', actorUserId: null });

    const result = await new ListInventoryItemsUseCase(items).execute({});

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.total).toBe(2);
      expect(result.value.items).toHaveLength(2);
    }
  });

  it('filtra por búsqueda de SKU/título', async () => {
    await new CreateInventoryItemUseCase(items).execute({ sku: 'SKU-001', title: 'Camiseta', actorUserId: null });
    await new CreateInventoryItemUseCase(items).execute({ sku: 'SKU-002', title: 'Pantalón', actorUserId: null });

    const result = await new ListInventoryItemsUseCase(items).execute({ search: 'camiseta' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.total).toBe(1);
      expect(result.value.items[0]?.sku).toBe('SKU-001');
    }
  });
});

describe('SetInventoryLevelUseCase / RemoveInventoryLevelUseCase', () => {
  let items: InMemoryInventoryItemRepository;
  let locations: InMemoryStockLocationRepository;
  let itemId: string;
  let locationId: string;

  beforeEach(async () => {
    items = new InMemoryInventoryItemRepository();
    locations = new InMemoryStockLocationRepository();

    const item = await new CreateInventoryItemUseCase(items).execute({ sku: 'SKU-001', actorUserId: null });
    if (!item.isOk()) throw new Error('setup falló');
    itemId = item.value.id;

    const location = await new CreateStockLocationUseCase(locations).execute({ name: 'Almacén central', actorUserId: null });
    if (!location.isOk()) throw new Error('setup falló');
    locationId = location.value.id;
  });

  it('establece el nivel de inventario de un ítem en una ubicación', async () => {
    const result = await new SetInventoryLevelUseCase(items, locations).execute({
      itemId,
      locationId,
      stockedQuantity: 100,
      incomingQuantity: 20,
      actorUserId: 'user-1',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const level = result.value.levels.find((candidate) => candidate.locationId === locationId);
      expect(level?.stockedQuantity).toBe(100);
      expect(level?.incomingQuantity).toBe(20);
      expect(level?.availableQuantity).toBe(100);
    }
    expect(items.activities.at(-1)?.action).toBe('inventory.level.set');
  });

  it('falla con InventoryItemNotFoundError si el ítem no existe', async () => {
    const result = await new SetInventoryLevelUseCase(items, locations).execute({
      itemId: 'nope',
      locationId,
      stockedQuantity: 10,
      actorUserId: null,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InventoryItemNotFoundError);
    }
  });

  it('falla con StockLocationNotFoundError si la ubicación no existe', async () => {
    const result = await new SetInventoryLevelUseCase(items, locations).execute({
      itemId,
      locationId: 'nope',
      stockedQuantity: 10,
      actorUserId: null,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(StockLocationNotFoundError);
    }
  });

  it('falla con InvalidQuantityError si la cantidad es negativa', async () => {
    const result = await new SetInventoryLevelUseCase(items, locations).execute({
      itemId,
      locationId,
      stockedQuantity: -1,
      actorUserId: null,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidQuantityError);
    }
  });

  it('elimina el nivel de inventario de un ítem en una ubicación', async () => {
    await new SetInventoryLevelUseCase(items, locations).execute({ itemId, locationId, stockedQuantity: 5, actorUserId: null });

    const result = await new RemoveInventoryLevelUseCase(items).execute({ itemId, locationId, actorUserId: 'user-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.levels.find((candidate) => candidate.locationId === locationId)).toBeUndefined();
    }
    expect(items.activities.at(-1)?.action).toBe('inventory.level.removed');
  });

  it('falla con InventoryLevelNotFoundError si el nivel no existe', async () => {
    const result = await new RemoveInventoryLevelUseCase(items).execute({ itemId, locationId, actorUserId: null });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InventoryLevelNotFoundError);
    }
  });
});
