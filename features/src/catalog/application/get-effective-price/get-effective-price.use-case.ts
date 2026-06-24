import { err, ok, Result, UseCase } from '@mitama/core';
import { NoPriceConfiguredError, ProductNotFoundError, ProductVariantNotFoundError } from '../../domain/errors';
import type { ProductReader } from '../../domain/product.repository';
import type { PriceListRepository } from '../../domain/price-list.repository';
import type { EffectivePriceOutput, GetEffectivePriceInput } from './get-effective-price.dto';

export type GetEffectivePriceError = ProductNotFoundError | ProductVariantNotFoundError | NoPriceConfiguredError;

/**
 * Resuelve el precio efectivo de una variante por prioridad:
 * lista de precios activa > oferta de variante > tier price > precio base.
 */
export class GetEffectivePriceUseCase implements UseCase<GetEffectivePriceInput, Result<EffectivePriceOutput, GetEffectivePriceError>> {
  constructor(
    private readonly products: ProductReader,
    private readonly priceLists: PriceListRepository,
  ) {}

  async execute(input: GetEffectivePriceInput): Promise<Result<EffectivePriceOutput, GetEffectivePriceError>> {
    const product = await this.products.findById(input.productId);
    if (!product) {
      return err(new ProductNotFoundError(input.productId));
    }

    const variant = product.variants.find((candidate) => candidate.id === input.variantId);
    if (!variant) {
      return err(new ProductVariantNotFoundError(input.variantId));
    }

    const currencyCode = input.currencyCode.trim().toUpperCase();
    const quantity = input.quantity ?? 1;
    const at = input.at ? new Date(input.at) : new Date();

    const basePrice = variant.prices.find((price) => price.minQuantity === null && price.currencyCode === currencyCode)?.amount ?? null;

    const activeLists = await this.priceLists.findActive();
    for (const priceList of activeLists) {
      const override = priceList.getPriceForVariant(variant.id, currencyCode, quantity, at);
      if (override) {
        return ok({ currencyCode, amount: override.amount, source: 'price_list', basePrice, priceListId: priceList.id });
      }
    }

    if (variant.salePrice !== null) {
      const startsOk = !variant.saleStartsAt || variant.saleStartsAt <= at;
      const endsOk = !variant.saleEndsAt || at <= variant.saleEndsAt;
      if (startsOk && endsOk) {
        return ok({ currencyCode, amount: variant.salePrice, source: 'sale', basePrice, priceListId: null });
      }
    }

    const tierPrices = variant.prices.filter(
      (price) =>
        price.currencyCode === currencyCode &&
        price.minQuantity !== null &&
        price.minQuantity <= quantity &&
        (price.maxQuantity === null || quantity <= price.maxQuantity),
    );
    if (tierPrices.length > 0) {
      const best = tierPrices.reduce((winner, candidate) => (candidate.minQuantity! > winner.minQuantity! ? candidate : winner));
      return ok({ currencyCode, amount: best.amount, source: 'tier_price', basePrice, priceListId: null });
    }

    if (basePrice !== null) {
      return ok({ currencyCode, amount: basePrice, source: 'base_price', basePrice, priceListId: null });
    }

    return err(new NoPriceConfiguredError(currencyCode));
  }
}
