import { err, ok, Result, UseCase } from '@mitama/core';
import { ProductCategoryNotFoundError } from '../../domain/errors';
import type { ProductCategoryRepository } from '../../domain/product-category.repository';

export interface DeleteCategoryInput {
  id: string;
  actorUserId: string | null;
}

/**
 * Elimina una categoría. Sus hijos directos (e indirectos) se "reanidan" un
 * nivel hacia arriba, ocupando el lugar de la categoría eliminada en el árbol.
 * La desasociación de productos la maneja la cascada de la tabla puente.
 */
export class DeleteCategoryUseCase implements UseCase<DeleteCategoryInput, Result<void, ProductCategoryNotFoundError>> {
  constructor(private readonly categories: ProductCategoryRepository) {}

  async execute(input: DeleteCategoryInput): Promise<Result<void, ProductCategoryNotFoundError>> {
    const category = await this.categories.findById(input.id);
    if (!category) {
      return err(new ProductCategoryNotFoundError(input.id));
    }

    const descendants = await this.categories.findDescendants(category);
    const fullPath = category.fullPath;
    const children = descendants.filter((descendant) => descendant.parentCategoryId === category.id);
    for (const child of children) {
      child.rehome(category.parentCategoryId, category.mpath, child.rank);
    }
    for (const descendant of descendants) {
      if (!children.includes(descendant)) {
        descendant.setMpath(category.mpath + descendant.mpath.slice(fullPath.length));
      }
    }

    await this.categories.remove(category, descendants, {
      userId: input.actorUserId,
      storeId: null,
      action: 'product-category.deleted',
      entityType: 'product_category',
      entityId: category.id,
      diff: { name: category.name, handle: category.handle },
    });

    return ok(undefined);
  }
}
