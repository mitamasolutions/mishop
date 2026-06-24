import { err, ok, Result, UseCase } from '@mitama/core';
import { CollectionNotFoundError } from '../../domain/errors';
import type { ProductCollectionRepository } from '../../domain/product-collection.repository';
import { toProductCollectionOutput, type ProductCollectionOutput } from '../product-collection.dto';

export class GetCollectionUseCase
  implements UseCase<string, Result<ProductCollectionOutput, CollectionNotFoundError>>
{
  constructor(private readonly collections: ProductCollectionRepository) {}

  async execute(id: string): Promise<Result<ProductCollectionOutput, CollectionNotFoundError>> {
    const collection = await this.collections.findById(id);
    if (!collection) {
      return err(new CollectionNotFoundError(id));
    }
    return ok(toProductCollectionOutput(collection));
  }
}
