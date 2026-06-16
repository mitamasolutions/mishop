import type { ShippingMethod } from './shipping-method.entity';

export interface ShippingMethodRepository {
  findEnabledByStore(storeId: string): Promise<ShippingMethod[]>;
  save(method: ShippingMethod): Promise<void>;
}
