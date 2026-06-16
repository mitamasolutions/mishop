import { ok, type Result, type UseCase } from '@mitama/core';
import type { PaymentProviderRegistry } from '../domain/payment-provider';
import type { PublicStorePaymentMethod, StorePaymentMethodRepository } from '../domain/store-payment-method.repository';
import { toDecryptedConfig, toPublicPaymentMethod } from '../domain/store-payment-method.repository';

export interface AvailablePaymentMethod {
  method: PublicStorePaymentMethod;
  status: 'configured' | 'misconfigured';
  misconfigurationReason?: string;
}

export class ResolveAvailablePaymentMethodsUseCase
  implements UseCase<string, Result<AvailablePaymentMethod[], never>>
{
  constructor(
    private readonly methods: StorePaymentMethodRepository,
    private readonly registry: PaymentProviderRegistry,
  ) {}

  async execute(storeId: string): Promise<Result<AvailablePaymentMethod[], never>> {
    const enabled = await this.methods.findEnabled(storeId);
    const items: AvailablePaymentMethod[] = enabled.map((method) => {
      const provider = this.registry.get(method.providerCode);
      if (!provider) {
        return { method: toPublicPaymentMethod(method), status: 'misconfigured', misconfigurationReason: `Provider ${method.providerCode} no registrado` };
      }
      const status = provider.validateConfig(toDecryptedConfig(method));
      return status.state === 'configured'
        ? { method: toPublicPaymentMethod(method), status: 'configured' }
        : { method: toPublicPaymentMethod(method), status: 'misconfigured', misconfigurationReason: status.reason };
    });
    return ok(items);
  }
}
