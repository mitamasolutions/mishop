import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { InvalidTierPriceRangeError, PriceListNotFoundError, ProductVariantNotFoundError } from '../../domain/errors';
import type { ProductRepository } from '../../domain/product.repository';
import type { PriceListRepository } from '../../domain/price-list.repository';
import { toPriceListOutput, type PriceListOutput } from '../price-list.dto';

export interface AddPriceListPriceInput {
  priceListId: string;
  variantId: string;
  currencyCode: string;
  amount: number;
  minQuantity?: number | null;
  maxQuantity?: number | null;
  actorUserId: string | null;
}

export type AddPriceListPriceError =
  | ValidationError
  | PriceListNotFoundError
  | ProductVariantNotFoundError
  | InvalidTierPriceRangeError;

export class AddPriceListPriceUseCase implements UseCase<AddPriceListPriceInput, Result<PriceListOutput, AddPriceListPriceError>> {
  constructor(
    private readonly priceLists: PriceListRepository,
    private readonly products: ProductRepository,
  ) {}

  async execute(input: AddPriceListPriceInput): Promise<Result<PriceListOutput, AddPriceListPriceError>> {
    const currencyCode = input.currencyCode.trim().toUpperCase();
    if (!currencyCode) {
      return err(new ValidationError('La moneda es obligatoria'));
    }
    if (input.amount < 0) {
      return err(new ValidationError('El precio no puede ser negativo'));
    }

    const priceList = await this.priceLists.findById(input.priceListId);
    if (!priceList) {
      return err(new PriceListNotFoundError(input.priceListId));
    }

    const variant = await this.products.findVariantById(input.variantId);
    if (!variant) {
      return err(new ProductVariantNotFoundError(input.variantId));
    }

    const result = priceList.addPrice({
      variantId: input.variantId,
      currencyCode,
      amount: input.amount,
      minQuantity: input.minQuantity,
      maxQuantity: input.maxQuantity,
    });
    if (result === 'invalid_range') {
      return err(new InvalidTierPriceRangeError());
    }

    await this.priceLists.update(priceList, {
      userId: input.actorUserId,
      storeId: null,
      action: 'price-list.price-added',
      entityType: 'price_list',
      entityId: priceList.id,
      diff: { variantId: input.variantId, priceId: result.id },
    });

    return ok(toPriceListOutput(priceList));
  }
}
