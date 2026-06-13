import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { ProductCollection } from '../../domain/product-collection.entity';
import { CollectionHandleAlreadyInUseError } from '../../domain/errors';
import type { ProductCollectionRepository } from '../../domain/product-collection.repository';
import { toProductCollectionOutput, type ProductCollectionOutput } from '../product-collection.dto';
import type { CreateCollectionInput } from './create-collection.dto';

export type CreateCollectionError = ValidationError | CollectionHandleAlreadyInUseError;

export class CreateCollectionUseCase
  implements UseCase<CreateCollectionInput, Result<ProductCollectionOutput, CreateCollectionError>>
{
  constructor(private readonly collections: ProductCollectionRepository) {}

  async execute(input: CreateCollectionInput): Promise<Result<ProductCollectionOutput, CreateCollectionError>> {
    const title = input.title.trim();
    if (!title) {
      return err(new ValidationError('El título de la colección es obligatorio'));
    }

    const collection = ProductCollection.create({ title, handle: input.handle ?? null });

    const existing = await this.collections.findByHandle(collection.handle);
    if (existing) {
      return err(new CollectionHandleAlreadyInUseError(collection.handle));
    }

    await this.collections.create(collection, {
      userId: input.actorUserId,
      storeId: null,
      action: 'product-collection.created',
      entityType: 'product_collection',
      entityId: collection.id,
      diff: { title: collection.title, handle: collection.handle },
    });

    return ok(toProductCollectionOutput(collection));
  }
}
