import { err, ok, Result, UseCase } from '@mitama/core';
import { ProductCategoryNotFoundError } from '../../domain/errors';
import type { ProductCategoryRepository } from '../../domain/product-category.repository';
import { toProductCategoryOutput, type ProductCategoryOutput } from '../product-category.dto';

export class GetCategoryUseCase implements UseCase<string, Result<ProductCategoryOutput, ProductCategoryNotFoundError>> {
  constructor(private readonly categories: ProductCategoryRepository) {}

  async execute(id: string): Promise<Result<ProductCategoryOutput, ProductCategoryNotFoundError>> {
    const category = await this.categories.findById(id);
    if (!category) {
      return err(new ProductCategoryNotFoundError(id));
    }
    return ok(toProductCategoryOutput(category));
  }
}
