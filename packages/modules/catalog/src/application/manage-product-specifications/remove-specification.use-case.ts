import { err, ok, Result, UseCase } from '@mitama/core';
import { ProductNotFoundError, ProductSpecificationNotFoundError } from '../../domain/errors';
import type { ProductReader, ProductWriter } from '../../domain/product.repository';
import { toProductOutput, type ProductOutput } from '../product.dto';

export interface RemoveSpecificationInput {
  productId: string;
  specificationId: string;
  actorUserId: string | null;
}

export type RemoveSpecificationError = ProductNotFoundError | ProductSpecificationNotFoundError;

export class RemoveSpecificationUseCase
  implements UseCase<RemoveSpecificationInput, Result<ProductOutput, RemoveSpecificationError>>
{
  constructor(private readonly products: ProductReader & ProductWriter) {}

  async execute(input: RemoveSpecificationInput): Promise<Result<ProductOutput, RemoveSpecificationError>> {
    const product = await this.products.findById(input.productId);
    if (!product) {
      return err(new ProductNotFoundError(input.productId));
    }

    const removed = product.removeSpecification(input.specificationId);
    if (!removed) {
      return err(new ProductSpecificationNotFoundError(input.specificationId));
    }

    await this.products.update(
      product,
      {
        userId: input.actorUserId,
        storeId: null,
        action: 'product.specification-removed',
        entityType: 'product',
        entityId: product.id,
        diff: { specificationId: input.specificationId },
      },
      null,
    );

    return ok(toProductOutput(product));
  }
}
