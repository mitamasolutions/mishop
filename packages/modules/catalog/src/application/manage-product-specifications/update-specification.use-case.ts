import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { ProductNotFoundError, ProductSpecificationNotFoundError } from '../../domain/errors';
import type { ProductReader, ProductWriter } from '../../domain/product.repository';
import { toProductOutput, type ProductOutput } from '../product.dto';

export interface UpdateSpecificationInput {
  productId: string;
  specificationId: string;
  name?: string;
  value?: string;
  rank?: number;
  actorUserId: string | null;
}

export type UpdateSpecificationError = ValidationError | ProductNotFoundError | ProductSpecificationNotFoundError;

export class UpdateSpecificationUseCase
  implements UseCase<UpdateSpecificationInput, Result<ProductOutput, UpdateSpecificationError>>
{
  constructor(private readonly products: ProductReader & ProductWriter) {}

  async execute(input: UpdateSpecificationInput): Promise<Result<ProductOutput, UpdateSpecificationError>> {
    if (input.name !== undefined && !input.name.trim()) {
      return err(new ValidationError('El nombre de la especificación es obligatorio'));
    }
    if (input.value !== undefined && !input.value.trim()) {
      return err(new ValidationError('El valor de la especificación es obligatorio'));
    }

    const product = await this.products.findById(input.productId);
    if (!product) {
      return err(new ProductNotFoundError(input.productId));
    }

    const specification = product.updateSpecification(input.specificationId, {
      name: input.name?.trim(),
      value: input.value?.trim(),
      rank: input.rank,
    });
    if (!specification) {
      return err(new ProductSpecificationNotFoundError(input.specificationId));
    }

    await this.products.update(
      product,
      {
        userId: input.actorUserId,
        storeId: null,
        action: 'product.specification-updated',
        entityType: 'product',
        entityId: product.id,
        diff: { specificationId: specification.id },
      },
      null,
    );

    return ok(toProductOutput(product));
  }
}
