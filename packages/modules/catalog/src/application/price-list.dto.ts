import type { PriceList, PriceListPriceProps } from '../domain/price-list.entity';

export interface PriceListPriceOutput {
  id: string;
  variantId: string;
  currencyCode: string;
  amount: number;
  minQuantity: number | null;
  maxQuantity: number | null;
}

export interface PriceListOutput {
  id: string;
  title: string;
  description: string | null;
  status: string;
  type: string;
  startsAt: string | null;
  endsAt: string | null;
  prices: PriceListPriceOutput[];
  createdAt: string;
  updatedAt: string;
}

function toPriceListPriceOutput(price: PriceListPriceProps): PriceListPriceOutput {
  return {
    id: price.id,
    variantId: price.variantId,
    currencyCode: price.currencyCode,
    amount: price.amount,
    minQuantity: price.minQuantity,
    maxQuantity: price.maxQuantity,
  };
}

export function toPriceListOutput(priceList: PriceList): PriceListOutput {
  return {
    id: priceList.id,
    title: priceList.title,
    description: priceList.description,
    status: priceList.status,
    type: priceList.type,
    startsAt: priceList.startsAt ? priceList.startsAt.toISOString() : null,
    endsAt: priceList.endsAt ? priceList.endsAt.toISOString() : null,
    prices: priceList.prices.map(toPriceListPriceOutput),
    createdAt: priceList.createdAt.toISOString(),
    updatedAt: priceList.updatedAt.toISOString(),
  };
}
