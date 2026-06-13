import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import {
  InvalidTierPriceRangeError,
  ProductNotFoundError,
  ProductVariantNotFoundError,
  VariantPriceNotFoundError,
} from '../../domain/errors';
import type { ProductRepository } from '../../domain/product.repository';
import { toProductOutput, type ProductOutput } from '../product.dto';

export interface UpdateVariantTierPriceInput {
  productId: string;
  variantId: string;
  priceId: string;
  currencyCode?: string;
  amount?: number;
  minQuantity?: number;
  maxQuantity?: number | null;
  actorUserId: string | null;
}

export type UpdateVariantTierPriceError =
  | ValidationError
  | ProductNotFoundError
  | ProductVariantNotFoundError
  | VariantPriceNotFoundError
  | InvalidTierPriceRangeError;

export class UpdateVariantTierPriceUseCase
  implements UseCase<UpdateVariantTierPriceInput, Result<ProductOutput, UpdateVariantTierPriceError>>
{
  constructor(private readonly products: ProductRepository) {}

  async execute(input: UpdateVariantTierPriceInput): Promise<Result<ProductOutput, UpdateVariantTierPriceError>> {
    const currencyCode = input.currencyCode !== undefined ? input.currencyCode.trim().toUpperCase() : undefined;
    if (currencyCode !== undefined && !currencyCode) {
      return err(new ValidationError('La moneda es obligatoria'));
    }
    if (input.amount !== undefined && input.amount < 0) {
      return err(new ValidationError('El precio no puede ser negativo'));
    }

    const product = await this.products.findById(input.productId);
    if (!product) {
      return err(new ProductNotFoundError(input.productId));
    }

    if (!product.variants.some((variant) => variant.id === input.variantId)) {
      return err(new ProductVariantNotFoundError(input.variantId));
    }

    const result = product.updateVariantTierPrice(input.variantId, input.priceId, {
      currencyCode,
      amount: input.amount,
      minQuantity: input.minQuantity,
      maxQuantity: input.maxQuantity,
    });
    if (result === 'not_found') {
      return err(new VariantPriceNotFoundError(input.priceId));
    }
    if (result === 'invalid_range') {
      return err(new InvalidTierPriceRangeError());
    }

    await this.products.update(
      product,
      {
        userId: input.actorUserId,
        storeId: null,
        action: 'product.variant-tier-price-updated',
        entityType: 'product',
        entityId: product.id,
        diff: { variantId: input.variantId, priceId: input.priceId },
      },
      null,
    );

    return ok(toProductOutput(product));
  }
}
