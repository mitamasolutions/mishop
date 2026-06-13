import { ok, Result, UseCase } from '@mitama/core';
import type { ProductCollectionRepository } from '../../domain/product-collection.repository';
import { toProductCollectionOutput, type ProductCollectionOutput } from '../product-collection.dto';

export class ListCollectionsUseCase implements UseCase<void, Result<ProductCollectionOutput[], never>> {
  constructor(private readonly collections: ProductCollectionRepository) {}

  async execute(): Promise<Result<ProductCollectionOutput[], never>> {
    const collections = await this.collections.findAll();
    return ok(collections.map(toProductCollectionOutput));
  }
}
