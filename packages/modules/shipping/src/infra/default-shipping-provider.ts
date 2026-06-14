import { ok, roundMoney, type Result } from '@mitama/core';
import type { ShippingMethod, ShippingRate, ShippingRateRequest } from '../domain/shipping-method.entity';
import type { ShippingProvider } from '../domain/shipping-provider';

export class DefaultShippingProvider implements ShippingProvider {
  readonly code = 'default';

  async calculateRate(method: ShippingMethod, request: ShippingRateRequest): Promise<Result<ShippingRate, Error>> {
    if (method.strategy === 'pickup') return ok(toRate(method, 0));
    if (method.strategy === 'fixed') return ok(toRate(method, method.baseAmount));
    if (method.strategy === 'weight') return ok(toRate(method, method.baseAmount + request.weightKg * method.perKgAmount));
    if (method.freeOverAmount !== null && request.cartTotal >= method.freeOverAmount) return ok(toRate(method, 0));
    return ok(toRate(method, method.baseAmount));
  }
}

function toRate(method: ShippingMethod, amount: number): ShippingRate {
  return { methodId: method.id, providerCode: method.providerCode, name: method.name, amount: roundMoney(amount) };
}
