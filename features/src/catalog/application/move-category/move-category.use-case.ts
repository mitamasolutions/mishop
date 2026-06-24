import { err, ok, Result, UseCase } from '@mitama/core';
import { CategoryInvalidParentError, ProductCategoryNotFoundError } from '../../domain/errors';
import type { ProductCategoryRepository } from '../../domain/product-category.repository';
import { toProductCategoryOutput, type ProductCategoryOutput } from '../product-category.dto';
import type { MoveCategoryInput } from './move-category.dto';

export type MoveCategoryError = ProductCategoryNotFoundError | CategoryInvalidParentError;

/** Mueve una categoría en el árbol (drag & drop): cambia su padre y/o su rango entre hermanos. */
export class MoveCategoryUseCase
  implements UseCase<MoveCategoryInput, Result<ProductCategoryOutput, MoveCategoryError>>
{
  constructor(private readonly categories: ProductCategoryRepository) {}

  async execute(input: MoveCategoryInput): Promise<Result<ProductCategoryOutput, MoveCategoryError>> {
    const category = await this.categories.findById(input.id);
    if (!category) {
      return err(new ProductCategoryNotFoundError(input.id));
    }

    let parentMpath = '';
    if (input.parentCategoryId) {
      if (input.parentCategoryId === category.id) {
        return err(new CategoryInvalidParentError('Una categoría no puede ser su propio padre'));
      }
      const parent = await this.categories.findById(input.parentCategoryId);
      if (!parent) {
        return err(new ProductCategoryNotFoundError(input.parentCategoryId));
      }
      if (parent.mpath.startsWith(category.fullPath)) {
        return err(new CategoryInvalidParentError('No se puede mover una categoría dentro de su propia descendencia'));
      }
      parentMpath = parent.mpath;
    }

    const descendants = await this.categories.findDescendants(category);
    const previousFullPath = category.reparent(input.parentCategoryId, parentMpath, input.rank);
    const newFullPath = category.fullPath;
    for (const descendant of descendants) {
      descendant.setMpath(newFullPath + descendant.mpath.slice(previousFullPath.length));
    }

    await this.categories.move(category, descendants, {
      userId: input.actorUserId,
      storeId: null,
      action: 'product-category.moved',
      entityType: 'product_category',
      entityId: category.id,
      diff: { parentCategoryId: category.parentCategoryId, rank: category.rank },
    });

    return ok(toProductCategoryOutput(category));
  }
}
