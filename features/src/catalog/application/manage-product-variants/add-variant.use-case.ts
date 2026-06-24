import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { InvalidVariantCombinationError, ProductNotFoundError, VariantSkuAlreadyInUseError } from '../../domain/errors';
import type { ProductReader, ProductWriter } from '../../domain/product.repository';
import { toProductOutput, type ProductOutput } from '../product.dto';
import type { VariantFieldsInput } from './variant-input.dto';

export interface AddVariantInput extends VariantFieldsInput {
  productId: string;
  title: string;
  sku: string;
  optionValueIds?: string[];
  actorUserId: string | null;
}

export type AddVariantError = ValidationError | ProductNotFoundError | VariantSkuAlreadyInUseError | InvalidVariantCombinationError;

export class AddVariantUseCase implements UseCase<AddVariantInput, Result<ProductOutput, AddVariantError>> {
  constructor(private readonly products: ProductReader & ProductWriter) {}

  async execute(input: AddVariantInput): Promise<Result<ProductOutput, AddVariantError>> {
    const sku = input.sku.trim();
    if (!sku) {
      return err(new ValidationError('El SKU de la variante es obligatorio'));
    }
    if (!input.title.trim()) {
      return err(new ValidationError('El título de la variante es obligatorio'));
    }

    const saleStartsAt = input.saleStartsAt ? new Date(input.saleStartsAt) : null;
    const saleEndsAt = input.saleEndsAt ? new Date(input.saleEndsAt) : null;
    if (saleStartsAt && saleEndsAt && saleEndsAt < saleStartsAt) {
      return err(new ValidationError('La fecha de fin de la oferta no puede ser anterior a la de inicio'));
    }

    const product = await this.products.findById(input.productId);
    if (!product) {
      return err(new ProductNotFoundError(input.productId));
    }

    const existingSku = await this.products.findVariantBySku(sku);
    if (existingSku) {
      return err(new VariantSkuAlreadyInUseError(sku));
    }

    const optionValueIds = input.optionValueIds ?? [];
    if (!product.hasValidOptionValueIds(optionValueIds)) {
      return err(new InvalidVariantCombinationError('Una o más opciones seleccionadas no existen en este producto'));
    }
    if (product.hasVariantCombination(optionValueIds)) {
      return err(new InvalidVariantCombinationError('Ya existe una variante con esa combinación de opciones'));
    }

    const variant = product.addVariant({
      title: input.title.trim(),
      sku,
      optionValueIds,
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
      metadata: input.metadata,
    });

    await this.products.update(
      product,
      {
        userId: input.actorUserId,
        storeId: null,
        action: 'product.variant-added',
        entityType: 'product',
        entityId: product.id,
        diff: { variantId: variant.id, sku: variant.sku },
      },
      null,
    );

    return ok(toProductOutput(product));
  }
}
