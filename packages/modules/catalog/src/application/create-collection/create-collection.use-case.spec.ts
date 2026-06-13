import { beforeEach, describe, expect, it } from 'vitest';
import type { RecordActivityInput } from '@mitama/activity-log';
import { ValidationError } from '@mitama/core';
import { CreateCollectionUseCase } from './create-collection.use-case';
import { UpdateCollectionUseCase } from '../update-collection/update-collection.use-case';
import { ProductCollection } from '../../domain/product-collection.entity';
import { CollectionHandleAlreadyInUseError } from '../../domain/errors';
import type { ProductCollectionRepository } from '../../domain/product-collection.repository';
import type { SlugRedirect } from '../../domain/brand.repository';

class InMemoryCollectionRepository implements ProductCollectionRepository {
  readonly collections = new Map<string, ProductCollection>();
  readonly activities: RecordActivityInput[] = [];
  readonly redirects: SlugRedirect[] = [];

  async findById(id: string): Promise<ProductCollection | null> {
    return this.collections.get(id) ?? null;
  }

  async findByHandle(handle: string): Promise<ProductCollection | null> {
    for (const collection of this.collections.values()) {
      if (collection.handle === handle) {
        return collection;
      }
    }
    return null;
  }

  async findAll(): Promise<ProductCollection[]> {
    return [...this.collections.values()];
  }

  async create(collection: ProductCollection, activity: RecordActivityInput): Promise<void> {
    this.collections.set(collection.id, collection);
    this.activities.push(activity);
  }

  async update(collection: ProductCollection, activity: RecordActivityInput, redirect: SlugRedirect | null): Promise<void> {
    this.collections.set(collection.id, collection);
    this.activities.push(activity);
    if (redirect) {
      this.redirects.push(redirect);
    }
  }
}

describe('CreateCollectionUseCase', () => {
  let collections: InMemoryCollectionRepository;

  beforeEach(() => {
    collections = new InMemoryCollectionRepository();
  });

  it('crea una colección y autogenera el slug desde el título', async () => {
    const result = await new CreateCollectionUseCase(collections).execute({
      title: 'Novedades de Verano',
      actorUserId: 'user-1',
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.handle).toBe('novedades-de-verano');
    }
  });

  it('falla con ValidationError si el título está vacío', async () => {
    const result = await new CreateCollectionUseCase(collections).execute({ title: '  ', actorUserId: null });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });

  it('falla con CollectionHandleAlreadyInUseError si el slug ya existe', async () => {
    await new CreateCollectionUseCase(collections).execute({ title: 'Novedades', actorUserId: null });
    const result = await new CreateCollectionUseCase(collections).execute({ title: 'Novedades', actorUserId: null });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(CollectionHandleAlreadyInUseError);
    }
  });
});

describe('UpdateCollectionUseCase', () => {
  let collections: InMemoryCollectionRepository;

  beforeEach(() => {
    collections = new InMemoryCollectionRepository();
  });

  it('registra un redirect 301 cuando cambia el slug', async () => {
    const created = await new CreateCollectionUseCase(collections).execute({ title: 'Ofertas', actorUserId: null });
    const id = created.isOk() ? created.value.id : '';

    const result = await new UpdateCollectionUseCase(collections).execute({
      id,
      handle: 'ofertas-especiales',
      actorUserId: null,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.handle).toBe('ofertas-especiales');
    }
    expect(collections.redirects).toHaveLength(1);
    expect(collections.redirects[0]).toMatchObject({
      fromPath: '/colecciones/ofertas',
      toPath: '/colecciones/ofertas-especiales',
      entityType: 'product_collection',
    });
  });
});
