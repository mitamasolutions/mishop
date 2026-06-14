import { Injectable } from '@nestjs/common';
import type { ShippingMethod } from '../domain/shipping-method.entity';
import type { ShippingMethodRepository } from '../domain/shipping-method.repository';

@Injectable()
export class InMemoryShippingMethodRepository implements ShippingMethodRepository {
  private readonly methods = new Map<string, ShippingMethod>();

  constructor() {
    void this.save({ id: 'fixed-default', storeId: 'default', providerCode: 'default', name: 'Envío estándar', enabled: true, zoneIds: ['mx-cdmx'], strategy: 'fixed', baseAmount: 99, perKgAmount: 0, freeOverAmount: null });
    void this.save({ id: 'pickup-default', storeId: 'default', providerCode: 'default', name: 'Pickup en tienda', enabled: true, zoneIds: [], strategy: 'pickup', baseAmount: 0, perKgAmount: 0, freeOverAmount: null });
  }

  async findEnabledByStore(storeId: string): Promise<ShippingMethod[]> {
    return [...this.methods.values()].filter((method) => method.enabled && (method.storeId === storeId || method.storeId === 'default'));
  }

  async save(method: ShippingMethod): Promise<void> {
    this.methods.set(method.id, { ...method, zoneIds: [...method.zoneIds] });
  }
}
