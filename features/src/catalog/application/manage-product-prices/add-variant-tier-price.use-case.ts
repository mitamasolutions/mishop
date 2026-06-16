import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { InvalidTierPriceRangeError, ProductNotFoundError, ProductVariantNotFoundError } from '../../domain/errors';
import type { ProductReader, ProductWriter } from '../../domain/product.repository';
import { toProductOutput, type ProductOutput } from '../product.dto';

export interface AddVariantTierPriceInput {
  productId: string;
  variantId: string;
  currencyCode: string;
  amount: number;
  minQuantity: number;
  maxQuantity?: number | null;
  actorUserId: string | null;
}

export type AddVariantTierPriceError =
  | ValidationError
  | ProductNotFoundError
  | ProductVariantNotFoundError
  | InvalidTierPriceRangeError;

export class AddVariantTierPriceUseCase implements UseCase<AddVariantTierPriceInput, Result<ProductOutput, AddVariantTierPriceError>> {
  constructor(private readonly products: ProductReader & ProductWriter) {}

  async execute(input: AddVariantTierPriceInput): Promise<Result<ProductOutput, AddVariantTierPriceError>> {
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

    const result = product.addVariantTierPrice(input.variantId, {
      currencyCode,
      amount: input.amount,
      minQuantity: input.minQuantity,
      maxQuantity: input.maxQuantity,
    });
    if (result === 'not_found') {
      return err(new ProductVariantNotFoundError(input.variantId));
    }
    if (result === 'invalid_range') {
      return err(new InvalidTierPriceRangeError());
    }

    await this.products.update(
      product,
      {
        userId: input.actorUserId,
        storeId: null,
        action: 'product.variant-tier-price-added',
        entityType: 'product',
        entityId: product.id,
        diff: { variantId: input.variantId, priceId: result.id },
      },
      null,
    );

    return ok(toProductOutput(product));
  }
}
