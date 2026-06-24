import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { CategoryHandleAlreadyInUseError, ProductCategoryNotFoundError } from '../../domain/errors';
import type { ProductCategoryRepository } from '../../domain/product-category.repository';
import type { SlugRedirect } from '../../domain/brand.repository';
import { toProductCategoryOutput, type ProductCategoryOutput } from '../product-category.dto';
import type { UpdateCategoryInput } from './update-category.dto';

export type UpdateCategoryError = ValidationError | ProductCategoryNotFoundError | CategoryHandleAlreadyInUseError;

export class UpdateCategoryUseCase
  implements UseCase<UpdateCategoryInput, Result<ProductCategoryOutput, UpdateCategoryError>>
{
  constructor(private readonly categories: ProductCategoryRepository) {}

  async execute(input: UpdateCategoryInput): Promise<Result<ProductCategoryOutput, UpdateCategoryError>> {
    const category = await this.categories.findById(input.id);
    if (!category) {
      return err(new ProductCategoryNotFoundError(input.id));
    }

    if (input.name !== undefined && !input.name.trim()) {
      return err(new ValidationError('El nombre de la categoría es obligatorio'));
    }

    const previousHandle = category.update({
      name: input.name?.trim(),
      description: input.description,
      handle: input.handle,
      isActive: input.isActive,
      isInternal: input.isInternal,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
    });

    let redirect: SlugRedirect | null = null;
    if (previousHandle) {
      const clash = await this.categories.findByHandle(category.handle);
      if (clash && clash.id !== category.id) {
        return err(new CategoryHandleAlreadyInUseError(category.handle));
      }
      redirect = {
        fromPath: `/categorias/${previousHandle}`,
        toPath: `/categorias/${category.handle}`,
        entityType: 'product_category',
      };
    }

    await this.categories.update(
      category,
      {
        userId: input.actorUserId,
        storeId: null,
        action: 'product-category.updated',
        entityType: 'product_category',
        entityId: category.id,
        diff: { name: category.name, handle: category.handle },
      },
      redirect,
    );

    return ok(toProductCategoryOutput(category));
  }
}
