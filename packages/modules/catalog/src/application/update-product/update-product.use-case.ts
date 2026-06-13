import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { ProductHandleAlreadyInUseError, ProductNotFoundError } from '../../domain/errors';
import type { ProductRepository } from '../../domain/product.repository';
import type { SlugRedirect } from '../../domain/brand.repository';
import { toProductOutput, type ProductOutput } from '../product.dto';
import type { UpdateProductInput } from './update-product.dto';

export type UpdateProductError = ValidationError | ProductNotFoundError | ProductHandleAlreadyInUseError;

export class UpdateProductUseCase implements UseCase<UpdateProductInput, Result<ProductOutput, UpdateProductError>> {
  constructor(private readonly products: ProductRepository) {}

  async execute(input: UpdateProductInput): Promise<Result<ProductOutput, UpdateProductError>> {
    const product = await this.products.findById(input.id);
    if (!product) {
      return err(new ProductNotFoundError(input.id));
    }

    if (input.title !== undefined && !input.title.trim()) {
      return err(new ValidationError('El título del producto es obligatorio'));
    }

    const previousHandle = product.update({
      title: input.title?.trim(),
      handle: input.handle,
      subtitle: input.subtitle,
      description: input.description,
      thumbnail: input.thumbnail,
      isGiftcard: input.isGiftcard,
      discountable: input.discountable,
      weight: input.weight,
      length: input.length,
      height: input.height,
      width: input.width,
      material: input.material,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      typeId: input.typeId,
      brandId: input.brandId,
      externalId: input.externalId,
      metadata: input.metadata,
    });

    if (input.categoryIds !== undefined) {
      product.setCategories(input.categoryIds);
    }
    if (input.collectionIds !== undefined) {
      product.setCollections(input.collectionIds);
    }
    if (input.tagIds !== undefined) {
      product.setTags(input.tagIds);
    }
    if (input.salesChannelIds !== undefined) {
      product.setSalesChannels(input.salesChannelIds);
    }

    let redirect: SlugRedirect | null = null;
    if (previousHandle) {
      const clash = await this.products.findByHandle(product.handle);
      if (clash && clash.id !== product.id) {
        return err(new ProductHandleAlreadyInUseError(product.handle));
      }
      redirect = {
        fromPath: `/productos/${previousHandle}`,
        toPath: `/productos/${product.handle}`,
        entityType: 'product',
      };
    }

    await this.products.update(
      product,
      {
        userId: input.actorUserId,
        storeId: null,
        action: 'product.updated',
        entityType: 'product',
        entityId: product.id,
        diff: { title: product.title, handle: product.handle },
      },
      redirect,
    );

    return ok(toProductOutput(product));
  }
}
