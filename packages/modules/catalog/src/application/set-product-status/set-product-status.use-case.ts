import { err, ok, Result, UseCase } from '@mitama/core';
import { ProductNotFoundError } from '../../domain/errors';
import type { ProductStatus } from '../../domain/product.entity';
import type { ProductReader, ProductWriter } from '../../domain/product.repository';
import { toProductOutput, type ProductOutput } from '../product.dto';

export interface SetProductStatusInput {
  id: string;
  status: ProductStatus;
  actorUserId: string | null;
}

export class SetProductStatusUseCase implements UseCase<SetProductStatusInput, Result<ProductOutput, ProductNotFoundError>> {
  constructor(private readonly products: ProductReader & ProductWriter) {}

  async execute(input: SetProductStatusInput): Promise<Result<ProductOutput, ProductNotFoundError>> {
    const product = await this.products.findById(input.id);
    if (!product) {
      return err(new ProductNotFoundError(input.id));
    }

    product.setStatus(input.status);

    await this.products.update(
      product,
      {
        userId: input.actorUserId,
        storeId: null,
        action: 'product.status-changed',
        entityType: 'product',
        entityId: product.id,
        diff: { status: product.status },
      },
      null,
    );

    return ok(toProductOutput(product));
  }
}
