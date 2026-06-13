import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { ProductNotFoundError } from '../../domain/errors';
import type { ProductRepository } from '../../domain/product.repository';
import { toProductOutput, type ProductOutput } from '../product.dto';

export interface AddProductOptionInput {
  productId: string;
  title: string;
  values?: string[];
  actorUserId: string | null;
}

export type AddProductOptionError = ValidationError | ProductNotFoundError;

/** Agrega una opción de variante (ej. "Talla") con sus valores iniciales. */
export class AddProductOptionUseCase implements UseCase<AddProductOptionInput, Result<ProductOutput, AddProductOptionError>> {
  constructor(private readonly products: ProductRepository) {}

  async execute(input: AddProductOptionInput): Promise<Result<ProductOutput, AddProductOptionError>> {
    const title = input.title.trim();
    if (!title) {
      return err(new ValidationError('El título de la opción es obligatorio'));
    }

    const product = await this.products.findById(input.productId);
    if (!product) {
      return err(new ProductNotFoundError(input.productId));
    }

    const values = (input.values ?? []).map((value) => value.trim()).filter((value) => value.length > 0);
    const option = product.addOption(title, values);

    await this.products.update(
      product,
      {
        userId: input.actorUserId,
        storeId: null,
        action: 'product.option-added',
        entityType: 'product',
        entityId: product.id,
        diff: { optionId: option.id, title: option.title },
      },
      null,
    );

    return ok(toProductOutput(product));
  }
}
