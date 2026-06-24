import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { Product } from '../../domain/product.entity';
import { ProductHandleAlreadyInUseError, VariantSkuAlreadyInUseError } from '../../domain/errors';
import type { ProductReader, ProductWriter } from '../../domain/product.repository';
import { toProductOutput, type ProductOutput } from '../product.dto';
import type { CreateProductInput } from './create-product.dto';

export type CreateProductError = ValidationError | ProductHandleAlreadyInUseError | VariantSkuAlreadyInUseError;

export class CreateProductUseCase implements UseCase<CreateProductInput, Result<ProductOutput, CreateProductError>> {
  constructor(private readonly products: ProductReader & ProductWriter) {}

  async execute(input: CreateProductInput): Promise<Result<ProductOutput, CreateProductError>> {
    const title = input.title.trim();
    if (!title) {
      return err(new ValidationError('El título del producto es obligatorio'));
    }

    const defaultVariantSku = input.defaultVariantSku.trim();
    if (!defaultVariantSku) {
      return err(new ValidationError('El SKU de la variante por defecto es obligatorio'));
    }

    const product = Product.create({
      title,
      handle: input.handle ?? null,
      subtitle: input.subtitle ?? null,
      description: input.description ?? null,
      status: input.status,
      thumbnail: input.thumbnail ?? null,
      isGiftcard: input.isGiftcard,
      discountable: input.discountable,
      weight: input.weight ?? null,
      length: input.length ?? null,
      height: input.height ?? null,
      width: input.width ?? null,
      material: input.material ?? null,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      typeId: input.typeId ?? null,
      brandId: input.brandId ?? null,
      externalId: input.externalId ?? null,
      metadata: input.metadata ?? null,
      categoryIds: input.categoryIds,
      collectionIds: input.collectionIds,
      tagIds: input.tagIds,
      salesChannelIds: input.salesChannelIds,
      defaultVariantSku,
      defaultVariantTitle: input.defaultVariantTitle,
    });

    const existingHandle = await this.products.findByHandle(product.handle);
    if (existingHandle) {
      return err(new ProductHandleAlreadyInUseError(product.handle));
    }

    const existingSku = await this.products.findVariantBySku(defaultVariantSku);
    if (existingSku) {
      return err(new VariantSkuAlreadyInUseError(defaultVariantSku));
    }

    await this.products.create(product, {
      userId: input.actorUserId,
      storeId: null,
      action: 'product.created',
      entityType: 'product',
      entityId: product.id,
      diff: { title: product.title, handle: product.handle },
    });

    return ok(toProductOutput(product));
  }
}
