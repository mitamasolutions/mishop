import { err, ok, Result, UseCase } from '@mitama/core';
import { ProductNotFoundError, ProductOptionNotFoundError, ProductOptionValueNotFoundError } from '../../domain/errors';
import type { ProductReader, ProductWriter } from '../../domain/product.repository';
import { toProductOutput, type ProductOutput } from '../product.dto';

export interface RemoveProductOptionValueInput {
  productId: string;
  optionId: string;
  valueId: string;
  actorUserId: string | null;
}

export type RemoveProductOptionValueError = ProductNotFoundError | ProductOptionNotFoundError | ProductOptionValueNotFoundError;

/** Elimina un valor de opción y lo quita de cualquier variante que lo referencie. */
export class RemoveProductOptionValueUseCase
  implements UseCase<RemoveProductOptionValueInput, Result<ProductOutput, RemoveProductOptionValueError>>
{
  constructor(private readonly products: ProductReader & ProductWriter) {}

  async execute(input: RemoveProductOptionValueInput): Promise<Result<ProductOutput, RemoveProductOptionValueError>> {
    const product = await this.products.findById(input.productId);
    if (!product) {
      return err(new ProductNotFoundError(input.productId));
    }

    const option = product.options.find((candidate) => candidate.id === input.optionId);
    if (!option) {
      return err(new ProductOptionNotFoundError(input.optionId));
    }

    const removed = product.removeOptionValue(input.optionId, input.valueId);
    if (!removed) {
      return err(new ProductOptionValueNotFoundError(input.valueId));
    }

    await this.products.update(
      product,
      {
        userId: input.actorUserId,
        storeId: null,
        action: 'product.option-value-removed',
        entityType: 'product',
        entityId: product.id,
        diff: { optionId: input.optionId, valueId: input.valueId },
      },
      null,
    );

    return ok(toProductOutput(product));
  }
}
