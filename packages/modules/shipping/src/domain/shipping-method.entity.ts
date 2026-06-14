export type ShippingRateStrategy = 'fixed' | 'weight' | 'cart-total' | 'pickup';

export interface ShippingMethod {
  id: string;
  storeId: string;
  providerCode: string;
  name: string;
  enabled: boolean;
  zoneIds: string[];
  strategy: ShippingRateStrategy;
  baseAmount: number;
  perKgAmount: number;
  freeOverAmount: number | null;
}

export interface ShippingAddress {
  countryCode?: string;
  regionCode?: string;
  territoryId?: string;
  zoneId?: string;
}

export interface ShippingRateRequest {
  storeId: string;
  address: ShippingAddress | null;
  cartTotal: number;
  weightKg: number;
}

export interface ShippingRate {
  methodId: string;
  providerCode: string;
  name: string;
  amount: number;
}

export function methodCoversAddress(method: ShippingMethod, address: ShippingAddress | null): boolean {
  if (method.strategy === 'pickup') return true;
  if (!address?.zoneId) return false;
  return method.zoneIds.includes(address.zoneId);
}
