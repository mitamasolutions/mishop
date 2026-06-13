import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { ProductNotFoundError, ProductOptionNotFoundError } from '../../domain/errors';
import type { ProductRepository } from '../../domain/product.repository';
import { toProductOutput, type ProductOutput } from '../product.dto';

export interface AddProductOptionValueInput {
  productId: string;
  optionId: string;
  value: string;
  actorUserId: string | null;
}

export type AddProductOptionValueError = ValidationError | ProductNotFoundError | ProductOptionNotFoundError;

export class AddProductOptionValueUseCase
  implements UseCase<AddProductOptionValueInput, Result<ProductOutput, AddProductOptionValueError>>
{
  constructor(private readonly products: ProductRepository) {}

  async execute(input: AddProductOptionValueInput): Promise<Result<ProductOutput, AddProductOptionValueError>> {
    const value = input.value.trim();
    if (!value) {
      return err(new ValidationError('El valor de la opción es obligatorio'));
    }

    const product = await this.products.findById(input.productId);
    if (!product) {
      return err(new ProductNotFoundError(input.productId));
    }

    const optionValue = product.addOptionValue(input.optionId, value);
    if (!optionValue) {
      return err(new ProductOptionNotFoundError(input.optionId));
    }

    await this.products.update(
      product,
      {
        userId: input.actorUserId,
        storeId: null,
        action: 'product.option-value-added',
        entityType: 'product',
        entityId: product.id,
        diff: { optionId: input.optionId, value: optionValue.value },
      },
      null,
    );

    return ok(toProductOutput(product));
  }
}
