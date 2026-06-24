import type { Result } from '@mitama/core';
import type { ShippingMethod, ShippingRateRequest, ShippingRate } from './shipping-method.entity';

export interface ShippingProvider {
  readonly code: string;
  calculateRate(method: ShippingMethod, request: ShippingRateRequest): Promise<Result<ShippingRate, Error>>;
}

export class ShippingProviderRegistry {
  private readonly providers = new Map<string, ShippingProvider>();

  constructor(providers: ShippingProvider[] = []) {
    providers.forEach((provider) => this.register(provider));
  }

  register(provider: ShippingProvider): void {
    if (this.providers.has(provider.code)) throw new Error(`Provider de envío duplicado: ${provider.code}`);
    this.providers.set(provider.code, provider);
  }

  get(code: string): ShippingProvider | null {
    return this.providers.get(code) ?? null;
  }
}
