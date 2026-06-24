import { err, ok, Result, UseCase } from '@mitama/core';
import { ProductNotFoundError, ProductOptionNotFoundError } from '../../domain/errors';
import type { ProductReader, ProductWriter } from '../../domain/product.repository';
import { toProductOutput, type ProductOutput } from '../product.dto';

export interface RemoveProductOptionInput {
  productId: string;
  optionId: string;
  actorUserId: string | null;
}

export type RemoveProductOptionError = ProductNotFoundError | ProductOptionNotFoundError;

/** Elimina una opción y limpia las referencias en las variantes existentes. */
export class RemoveProductOptionUseCase
  implements UseCase<RemoveProductOptionInput, Result<ProductOutput, RemoveProductOptionError>>
{
  constructor(private readonly products: ProductReader & ProductWriter) {}

  async execute(input: RemoveProductOptionInput): Promise<Result<ProductOutput, RemoveProductOptionError>> {
    const product = await this.products.findById(input.productId);
    if (!product) {
      return err(new ProductNotFoundError(input.productId));
    }

    const removed = product.removeOption(input.optionId);
    if (!removed) {
      return err(new ProductOptionNotFoundError(input.optionId));
    }

    await this.products.update(
      product,
      {
        userId: input.actorUserId,
        storeId: null,
        action: 'product.option-removed',
        entityType: 'product',
        entityId: product.id,
        diff: { optionId: input.optionId },
      },
      null,
    );

    return ok(toProductOutput(product));
  }
}
