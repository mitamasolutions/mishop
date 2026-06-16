import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { ProductNotFoundError } from '../../domain/errors';
import type { ProductReader, ProductWriter } from '../../domain/product.repository';
import { toProductOutput, type ProductOutput } from '../product.dto';

export interface AddSpecificationInput {
  productId: string;
  name: string;
  value: string;
  rank?: number;
  actorUserId: string | null;
}

export type AddSpecificationError = ValidationError | ProductNotFoundError;

/** Agrega un atributo de especificación (descriptivo, no genera variantes). */
export class AddSpecificationUseCase implements UseCase<AddSpecificationInput, Result<ProductOutput, AddSpecificationError>> {
  constructor(private readonly products: ProductReader & ProductWriter) {}

  async execute(input: AddSpecificationInput): Promise<Result<ProductOutput, AddSpecificationError>> {
    const name = input.name.trim();
    const value = input.value.trim();
    if (!name || !value) {
      return err(new ValidationError('El nombre y el valor de la especificación son obligatorios'));
    }

    const product = await this.products.findById(input.productId);
    if (!product) {
      return err(new ProductNotFoundError(input.productId));
    }

    const specification = product.addSpecification(name, value, input.rank);

    await this.products.update(
      product,
      {
        userId: input.actorUserId,
        storeId: null,
        action: 'product.specification-added',
        entityType: 'product',
        entityId: product.id,
        diff: { specificationId: specification.id, name: specification.name },
      },
      null,
    );

    return ok(toProductOutput(product));
  }
}
