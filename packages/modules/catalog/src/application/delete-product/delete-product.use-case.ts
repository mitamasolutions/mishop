import { err, ok, Result, UseCase } from '@mitama/core';
import { ProductNotFoundError } from '../../domain/errors';
import type { ProductRepository } from '../../domain/product.repository';

export interface DeleteProductInput {
  id: string;
  actorUserId: string | null;
}

/** Baja lógica de un producto (`deletedAt`). */
export class DeleteProductUseCase implements UseCase<DeleteProductInput, Result<void, ProductNotFoundError>> {
  constructor(private readonly products: ProductRepository) {}

  async execute(input: DeleteProductInput): Promise<Result<void, ProductNotFoundError>> {
    const product = await this.products.findById(input.id);
    if (!product) {
      return err(new ProductNotFoundError(input.id));
    }

    await this.products.remove(product, {
      userId: input.actorUserId,
      storeId: null,
      action: 'product.deleted',
      entityType: 'product',
      entityId: product.id,
      diff: { title: product.title, handle: product.handle },
    });

    return ok(undefined);
  }
}
