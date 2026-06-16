import { err, ok, Result, UseCase } from '@mitama/core';
import { ProductNotFoundError, ProductVariantNotFoundError, VariantPriceNotFoundError } from '../../domain/errors';
import type { ProductReader, ProductWriter } from '../../domain/product.repository';
import { toProductOutput, type ProductOutput } from '../product.dto';

export interface RemoveVariantTierPriceInput {
  productId: string;
  variantId: string;
  priceId: string;
  actorUserId: string | null;
}

export type RemoveVariantTierPriceError = ProductNotFoundError | ProductVariantNotFoundError | VariantPriceNotFoundError;

export class RemoveVariantTierPriceUseCase
  implements UseCase<RemoveVariantTierPriceInput, Result<ProductOutput, RemoveVariantTierPriceError>>
{
  constructor(private readonly products: ProductReader & ProductWriter) {}

  async execute(input: RemoveVariantTierPriceInput): Promise<Result<ProductOutput, RemoveVariantTierPriceError>> {
    const product = await this.products.findById(input.productId);
    if (!product) {
      return err(new ProductNotFoundError(input.productId));
    }

    if (!product.variants.some((variant) => variant.id === input.variantId)) {
      return err(new ProductVariantNotFoundError(input.variantId));
    }

    const removed = product.removeVariantTierPrice(input.variantId, input.priceId);
    if (!removed) {
      return err(new VariantPriceNotFoundError(input.priceId));
    }

    await this.products.update(
      product,
      {
        userId: input.actorUserId,
        storeId: null,
        action: 'product.variant-tier-price-removed',
        entityType: 'product',
        entityId: product.id,
        diff: { variantId: input.variantId, priceId: input.priceId },
      },
      null,
    );

    return ok(toProductOutput(product));
  }
}
