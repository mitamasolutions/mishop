import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { ProductNotFoundError, ProductVariantNotFoundError } from '../../domain/errors';
import type { ProductReader, ProductWriter } from '../../domain/product.repository';
import { toProductOutput, type ProductOutput } from '../product.dto';

export interface SetVariantBasePriceInput {
  productId: string;
  variantId: string;
  currencyCode: string;
  amount: number;
  actorUserId: string | null;
}

export type SetVariantBasePriceError = ValidationError | ProductNotFoundError | ProductVariantNotFoundError;

export class SetVariantBasePriceUseCase implements UseCase<SetVariantBasePriceInput, Result<ProductOutput, SetVariantBasePriceError>> {
  constructor(private readonly products: ProductReader & ProductWriter) {}

  async execute(input: SetVariantBasePriceInput): Promise<Result<ProductOutput, SetVariantBasePriceError>> {
    const currencyCode = input.currencyCode.trim().toUpperCase();
    if (!currencyCode) {
      return err(new ValidationError('La moneda es obligatoria'));
    }
    if (input.amount < 0) {
      return err(new ValidationError('El precio no puede ser negativo'));
    }

    const product = await this.products.findById(input.productId);
    if (!product) {
      return err(new ProductNotFoundError(input.productId));
    }

    if (!product.variants.some((variant) => variant.id === input.variantId)) {
      return err(new ProductVariantNotFoundError(input.variantId));
    }

    const result = product.setVariantBasePrice(input.variantId, currencyCode, input.amount);
    if (result === 'not_found') {
      return err(new ProductVariantNotFoundError(input.variantId));
    }

    await this.products.update(
      product,
      {
        userId: input.actorUserId,
        storeId: null,
        action: 'product.variant-price-set',
        entityType: 'product',
        entityId: product.id,
        diff: { variantId: input.variantId, currencyCode, amount: input.amount },
      },
      null,
    );

    return ok(toProductOutput(product));
  }
}
