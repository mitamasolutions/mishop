import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { CollectionHandleAlreadyInUseError, CollectionNotFoundError } from '../../domain/errors';
import type { ProductCollectionRepository } from '../../domain/product-collection.repository';
import type { SlugRedirect } from '../../domain/brand.repository';
import { toProductCollectionOutput, type ProductCollectionOutput } from '../product-collection.dto';
import type { UpdateCollectionInput } from './update-collection.dto';

export type UpdateCollectionError = ValidationError | CollectionNotFoundError | CollectionHandleAlreadyInUseError;

export class UpdateCollectionUseCase
  implements UseCase<UpdateCollectionInput, Result<ProductCollectionOutput, UpdateCollectionError>>
{
  constructor(private readonly collections: ProductCollectionRepository) {}

  async execute(input: UpdateCollectionInput): Promise<Result<ProductCollectionOutput, UpdateCollectionError>> {
    const collection = await this.collections.findById(input.id);
    if (!collection) {
      return err(new CollectionNotFoundError(input.id));
    }

    if (input.title !== undefined && !input.title.trim()) {
      return err(new ValidationError('El título de la colección es obligatorio'));
    }

    const previousHandle = collection.update({ title: input.title?.trim(), handle: input.handle });

    let redirect: SlugRedirect | null = null;
    if (previousHandle) {
      const clash = await this.collections.findByHandle(collection.handle);
      if (clash && clash.id !== collection.id) {
        return err(new CollectionHandleAlreadyInUseError(collection.handle));
      }
      redirect = {
        fromPath: `/colecciones/${previousHandle}`,
        toPath: `/colecciones/${collection.handle}`,
        entityType: 'product_collection',
      };
    }

    await this.collections.update(
      collection,
      {
        userId: input.actorUserId,
        storeId: null,
        action: 'product-collection.updated',
        entityType: 'product_collection',
        entityId: collection.id,
        diff: { title: collection.title, handle: collection.handle },
      },
      redirect,
    );

    return ok(toProductCollectionOutput(collection));
  }
}
