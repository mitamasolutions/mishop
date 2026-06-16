import { err, ok, Result, UseCase } from '@mitama/core';
import { LastVariantCannotBeRemovedError, ProductNotFoundError, ProductVariantNotFoundError } from '../../domain/errors';
import type { ProductReader, ProductWriter } from '../../domain/product.repository';
import { toProductOutput, type ProductOutput } from '../product.dto';

export interface RemoveVariantInput {
  productId: string;
  variantId: string;
  actorUserId: string | null;
}

export type RemoveVariantError = ProductNotFoundError | ProductVariantNotFoundError | LastVariantCannotBeRemovedError;

export class RemoveVariantUseCase implements UseCase<RemoveVariantInput, Result<ProductOutput, RemoveVariantError>> {
  constructor(private readonly products: ProductReader & ProductWriter) {}

  async execute(input: RemoveVariantInput): Promise<Result<ProductOutput, RemoveVariantError>> {
    const product = await this.products.findById(input.productId);
    if (!product) {
      return err(new ProductNotFoundError(input.productId));
    }

    const result = product.removeVariant(input.variantId);
    if (result === 'last_variant') {
      return err(new LastVariantCannotBeRemovedError());
    }
    if (result === 'not_found') {
      return err(new ProductVariantNotFoundError(input.variantId));
    }

    await this.products.update(
      product,
      {
        userId: input.actorUserId,
        storeId: null,
        action: 'product.variant-removed',
        entityType: 'product',
        entityId: product.id,
        diff: { variantId: input.variantId },
      },
      null,
    );

    return ok(toProductOutput(product));
  }
}
