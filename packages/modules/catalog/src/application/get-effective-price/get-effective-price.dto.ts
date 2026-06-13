export interface GetEffectivePriceInput {
  productId: string;
  variantId: string;
  currencyCode: string;
  quantity?: number;
  at?: string;
}

export type EffectivePriceSource = 'price_list' | 'sale' | 'tier_price' | 'base_price';

export interface EffectivePriceOutput {
  currencyCode: string;
  amount: number;
  source: EffectivePriceSource;
  basePrice: number | null;
  priceListId: string | null;
}
