import { Injectable } from '@nestjs/common';
import type { StorePaymentMethod, StorePaymentMethodRepository } from '../domain/store-payment-method.repository';

@Injectable()
export class InMemoryStorePaymentMethodRepository implements StorePaymentMethodRepository {
  readonly methods = new Map<string, StorePaymentMethod>();

  constructor() {
    for (const providerCode of ['manual', 'cash', 'mercado-pago']) {
      const displayName = providerCode === 'mercado-pago' ? 'Mercado Pago' : providerCode[0]!.toUpperCase() + providerCode.slice(1);
      void this.save({
        id: `default-${providerCode}`,
        storeId: 'default',
        providerCode,
        displayName,
        enabled: true,
        credentials: providerCode === 'mercado-pago' ? { accessToken: 'test-access-token', publicKey: 'test-public-key' } : {},
        webhookSecret: 'test-secret',
        captureMode: providerCode === 'manual' || providerCode === 'cash' ? 'manual' : 'automatic',
      });
    }
  }

  async findEnabled(storeId: string): Promise<StorePaymentMethod[]> {
    return [...this.methods.values()].filter((method) => method.enabled && (method.storeId === storeId || method.storeId === 'default'));
  }

  async findEnabledByProvider(storeId: string, providerCode: string): Promise<StorePaymentMethod | null> {
    return (await this.findEnabled(storeId)).find((method) => method.providerCode === providerCode) ?? null;
  }

  async findEnabledByProviderAcrossStores(providerCode: string): Promise<StorePaymentMethod[]> {
    return [...this.methods.values()].filter((method) => method.enabled && method.providerCode === providerCode);
  }

  async findByProvider(storeId: string, providerCode: string): Promise<StorePaymentMethod | null> {
    return (
      [...this.methods.values()].find(
        (method) => method.providerCode === providerCode && (method.storeId === storeId || method.storeId === 'default'),
      ) ?? null
    );
  }

  async save(method: StorePaymentMethod): Promise<void> {
    this.methods.set(`${method.storeId}:${method.providerCode}`, { ...method, credentials: { ...method.credentials } });
  }
}
