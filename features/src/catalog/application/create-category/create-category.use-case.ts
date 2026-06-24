import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { ProductCategory } from '../../domain/product-category.entity';
import { CategoryHandleAlreadyInUseError, ProductCategoryNotFoundError } from '../../domain/errors';
import type { ProductCategoryRepository } from '../../domain/product-category.repository';
import { toProductCategoryOutput, type ProductCategoryOutput } from '../product-category.dto';
import type { CreateCategoryInput } from './create-category.dto';

export type CreateCategoryError = ValidationError | CategoryHandleAlreadyInUseError | ProductCategoryNotFoundError;

export class CreateCategoryUseCase
  implements UseCase<CreateCategoryInput, Result<ProductCategoryOutput, CreateCategoryError>>
{
  constructor(private readonly categories: ProductCategoryRepository) {}

  async execute(input: CreateCategoryInput): Promise<Result<ProductCategoryOutput, CreateCategoryError>> {
    const name = input.name.trim();
    if (!name) {
      return err(new ValidationError('El nombre de la categoría es obligatorio'));
    }

    let parentMpath = '';
    if (input.parentCategoryId) {
      const parent = await this.categories.findById(input.parentCategoryId);
      if (!parent) {
        return err(new ProductCategoryNotFoundError(input.parentCategoryId));
      }
      parentMpath = parent.mpath;
    }

    const category = ProductCategory.create({
      name,
      description: input.description ?? null,
      handle: input.handle ?? null,
      parentCategoryId: input.parentCategoryId ?? null,
      parentMpath,
      isActive: input.isActive,
      isInternal: input.isInternal,
      rank: input.rank,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
    });

    const existing = await this.categories.findByHandle(category.handle);
    if (existing) {
      return err(new CategoryHandleAlreadyInUseError(category.handle));
    }

    await this.categories.create(category, {
      userId: input.actorUserId,
      storeId: null,
      action: 'product-category.created',
      entityType: 'product_category',
      entityId: category.id,
      diff: { name: category.name, handle: category.handle, parentCategoryId: category.parentCategoryId },
    });

    return ok(toProductCategoryOutput(category));
  }
}
