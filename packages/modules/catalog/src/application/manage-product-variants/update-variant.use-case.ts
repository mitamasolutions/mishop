import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import {
  InvalidVariantCombinationError,
  ProductNotFoundError,
  ProductVariantNotFoundError,
  VariantSkuAlreadyInUseError,
} from '../../domain/errors';
import type { ProductReader, ProductWriter } from '../../domain/product.repository';
import { toProductOutput, type ProductOutput } from '../product.dto';
import type { VariantFieldsInput } from './variant-input.dto';

export interface UpdateVariantInput extends VariantFieldsInput {
  productId: string;
  variantId: string;
  optionValueIds?: string[];
  actorUserId: string | null;
}

export type UpdateVariantError =
  | ValidationError
  | ProductNotFoundError
  | ProductVariantNotFoundError
  | VariantSkuAlreadyInUseError
  | InvalidVariantCombinationError;

export class UpdateVariantUseCase implements UseCase<UpdateVariantInput, Result<ProductOutput, UpdateVariantError>> {
  constructor(private readonly products: ProductReader & ProductWriter) {}

  async execute(input: UpdateVariantInput): Promise<Result<ProductOutput, UpdateVariantError>> {
    if (input.sku !== undefined && !input.sku.trim()) {
      return err(new ValidationError('El SKU de la variante es obligatorio'));
    }
    if (input.title !== undefined && !input.title.trim()) {
      return err(new ValidationError('El título de la variante es obligatorio'));
    }

    const saleStartsAt = input.saleStartsAt !== undefined ? (input.saleStartsAt ? new Date(input.saleStartsAt) : null) : undefined;
    const saleEndsAt = input.saleEndsAt !== undefined ? (input.saleEndsAt ? new Date(input.saleEndsAt) : null) : undefined;

    const product = await this.products.findById(input.productId);
    if (!product) {
      return err(new ProductNotFoundError(input.productId));
    }

    const variant = product.variants.find((candidate) => candidate.id === input.variantId);
    if (!variant) {
      return err(new ProductVariantNotFoundError(input.variantId));
    }

    const effectiveStartsAt = saleStartsAt !== undefined ? saleStartsAt : variant.saleStartsAt;
    const effectiveEndsAt = saleEndsAt !== undefined ? saleEndsAt : variant.saleEndsAt;
    if (effectiveStartsAt && effectiveEndsAt && effectiveEndsAt < effectiveStartsAt) {
      return err(new ValidationError('La fecha de fin de la oferta no puede ser anterior a la de inicio'));
    }

    const sku = input.sku?.trim();
    if (sku !== undefined && sku !== variant.sku) {
      const existingSku = await this.products.findVariantBySku(sku);
      if (existingSku && existingSku.variantId !== variant.id) {
        return err(new VariantSkuAlreadyInUseError(sku));
      }
    }

    if (input.optionValueIds !== undefined) {
      if (!product.hasValidOptionValueIds(input.optionValueIds)) {
        return err(new InvalidVariantCombinationError('Una o más opciones seleccionadas no existen en este producto'));
      }
      const others = product.variants.filter((candidate) => candidate.id !== variant.id);
      const key = [...input.optionValueIds].sort().join('|');
      const duplicate = others.some((candidate) => [...candidate.optionValueIds].sort().join('|') === key);
      if (duplicate) {
        return err(new InvalidVariantCombinationError('Ya existe una variante con esa combinación de opciones'));
      }
    }

    product.updateVariant(input.variantId, {
      title: input.title?.trim(),
      sku,
      barcode: input.barcode,
      ean: input.ean,
      upc: input.upc,
      allowBackorder: input.allowBackorder,
      manageInventory: input.manageInventory,
      lowStockThreshold: input.lowStockThreshold,
      cost: input.cost,
      salePrice: input.salePrice,
      saleStartsAt,
      saleEndsAt,
      weight: input.weight,
      length: input.length,
      height: input.height,
      width: input.width,
      variantRank: input.variantRank,
      optionValueIds: input.optionValueIds,
      metadata: input.metadata,
    });

    await this.products.update(
      product,
      {
        userId: input.actorUserId,
        storeId: null,
        action: 'product.variant-updated',
        entityType: 'product',
        entityId: product.id,
        diff: { variantId: input.variantId },
      },
      null,
    );

    return ok(toProductOutput(product));
  }
}
