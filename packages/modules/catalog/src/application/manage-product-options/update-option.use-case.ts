import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { ProductNotFoundError, ProductOptionNotFoundError } from '../../domain/errors';
import type { ProductReader, ProductWriter } from '../../domain/product.repository';
import { toProductOutput, type ProductOutput } from '../product.dto';

export interface UpdateProductOptionInput {
  productId: string;
  optionId: string;
  title: string;
  actorUserId: string | null;
}

export type UpdateProductOptionError = ValidationError | ProductNotFoundError | ProductOptionNotFoundError;

export class UpdateProductOptionUseCase
  implements UseCase<UpdateProductOptionInput, Result<ProductOutput, UpdateProductOptionError>>
{
  constructor(private readonly products: ProductReader & ProductWriter) {}

  async execute(input: UpdateProductOptionInput): Promise<Result<ProductOutput, UpdateProductOptionError>> {
    const title = input.title.trim();
    if (!title) {
      return err(new ValidationError('El título de la opción es obligatorio'));
    }

    const product = await this.products.findById(input.productId);
    if (!product) {
      return err(new ProductNotFoundError(input.productId));
    }

    const option = product.updateOption(input.optionId, { title });
    if (!option) {
      return err(new ProductOptionNotFoundError(input.optionId));
    }

    await this.products.update(
      product,
      {
        userId: input.actorUserId,
        storeId: null,
        action: 'product.option-updated',
        entityType: 'product',
        entityId: product.id,
        diff: { optionId: option.id, title: option.title },
      },
      null,
    );

    return ok(toProductOutput(product));
  }
}
