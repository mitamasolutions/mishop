import { ok, Result, UseCase } from '@mitama/core';
import type { ProductCategoryRepository } from '../../domain/product-category.repository';
import { toProductCategoryOutput, type ProductCategoryOutput } from '../product-category.dto';

/** Lista todas las categorías (plano); la UI construye el árbol con `parentCategoryId`. */
export class ListCategoriesUseCase implements UseCase<void, Result<ProductCategoryOutput[], never>> {
  constructor(private readonly categories: ProductCategoryRepository) {}

  async execute(): Promise<Result<ProductCategoryOutput[], never>> {
    const categories = await this.categories.findAll();
    return ok(categories.map(toProductCategoryOutput));
  }
}
