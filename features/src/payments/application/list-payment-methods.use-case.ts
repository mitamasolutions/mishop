import { ok, type Result, type UseCase } from '@mitama/core';
import type { PaymentProviderRegistry } from '../domain/payment-provider';
import type { PublicStorePaymentMethod, StorePaymentMethodRepository } from '../domain/store-payment-method.repository';
import { toDecryptedConfig, toPublicPaymentMethod } from '../domain/store-payment-method.repository';

export class ListPaymentMethodsUseCase implements UseCase<string, Result<PublicStorePaymentMethod[], never>> {
  constructor(
    private readonly methods: StorePaymentMethodRepository,
    private readonly registry: PaymentProviderRegistry,
  ) {}

  async execute(storeId: string): Promise<Result<PublicStorePaymentMethod[], never>> {
    const enabled = await this.methods.findEnabled(storeId);
    const configured = enabled.filter((method) => {
      const provider = this.registry.get(method.providerCode);
      if (!provider) return false;
      return provider.validateConfig(toDecryptedConfig(method)).state === 'configured';
    });
    return ok(configured.map(toPublicPaymentMethod));
  }
}
