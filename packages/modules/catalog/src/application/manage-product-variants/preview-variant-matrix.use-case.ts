import { err, ok, Result, UseCase } from '@mitama/core';
import { ProductNotFoundError } from '../../domain/errors';
import type { ProductRepository } from '../../domain/product.repository';

export interface VariantCombinationPreview {
  optionValueIds: string[];
  label: string;
  exists: boolean;
}

/**
 * Calcula la matriz de combinaciones posibles según las opciones del producto
 * (producto cartesiano) e indica cuáles ya tienen una variante creada. La UI
 * usa esto para proponer las combinaciones faltantes y que el admin capture
 * SKU/precio/costo de cada una.
 */
export class PreviewVariantMatrixUseCase implements UseCase<string, Result<VariantCombinationPreview[], ProductNotFoundError>> {
  constructor(private readonly products: ProductRepository) {}

  async execute(productId: string): Promise<Result<VariantCombinationPreview[], ProductNotFoundError>> {
    const product = await this.products.findById(productId);
    if (!product) {
      return err(new ProductNotFoundError(productId));
    }

    const combinations = product.optionCombinations();
    return ok(
      combinations.map((combination) => ({
        ...combination,
        exists: product.hasVariantCombination(combination.optionValueIds),
      })),
    );
  }
}
