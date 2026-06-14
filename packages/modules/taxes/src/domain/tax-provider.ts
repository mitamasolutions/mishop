import type { Result } from '@mitama/core';

export type TaxCategory = 'standard' | 'zero' | 'exempt';

export interface TaxLineInput {
  lineId: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  taxCategory?: TaxCategory | null;
}

export interface TaxCalculationInput {
  storeId: string;
  regionId: string;
  pricesIncludeTax: boolean;
  lines: TaxLineInput[];
}

export interface TaxLineOutput {
  lineId: string;
  taxCategory: TaxCategory;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
}

export interface TaxCalculationOutput {
  taxTotal: number;
  subtotal: number;
  total: number;
  lines: TaxLineOutput[];
  warnings: string[];
}

export interface TaxProvider {
  readonly code: string;
  calculate(input: TaxCalculationInput): Promise<Result<TaxCalculationOutput, Error>>;
}

export class TaxProviderRegistry {
  private readonly providers = new Map<string, TaxProvider>();

  constructor(providers: TaxProvider[] = []) {
    providers.forEach((provider) => this.register(provider));
  }

  register(provider: TaxProvider): void {
    if (this.providers.has(provider.code)) throw new Error(`Provider de impuestos duplicado: ${provider.code}`);
    this.providers.set(provider.code, provider);
  }

  get(code: string): TaxProvider | null {
    return this.providers.get(code) ?? null;
  }
}
