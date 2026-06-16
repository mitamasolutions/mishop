import { ok, type Result, type UseCase } from '@mitama/core';
import type { PaymentProviderRegistry } from '../domain/payment-provider';
import type { PublicStorePaymentMethod, StorePaymentMethod, StorePaymentMethodRepository } from '../domain/store-payment-method.repository';
import { toPublicPaymentMethod } from '../domain/store-payment-method.repository';

export interface ConfigureStorePaymentMethodInput {
  storeId: string;
  providerCode: string;
  displayName?: string;
  enabled?: boolean;
  webhookSecret?: string | null;
  captureMode?: 'manual' | 'automatic';
  credentials?: Record<string, unknown>;
}

export class ConfigureStorePaymentMethodUseCase
  implements UseCase<ConfigureStorePaymentMethodInput, Result<PublicStorePaymentMethod, never>>
{
  constructor(
    private readonly methods: StorePaymentMethodRepository,
    private readonly registry: PaymentProviderRegistry,
  ) {}

  async execute(input: ConfigureStorePaymentMethodInput): Promise<Result<PublicStorePaymentMethod, never>> {
    const provider = this.registry.get(input.providerCode);
    if (!provider) throw new Error(`Provider ${input.providerCode} no registrado`);
    const existing = await this.methods.findByProvider(input.storeId, input.providerCode);
    const next: StorePaymentMethod = {
      id: existing?.id ?? `${input.storeId}-${input.providerCode}`,
      storeId: input.storeId,
      providerCode: input.providerCode,
      displayName: input.displayName ?? existing?.displayName ?? provider.displayName,
      enabled: input.enabled ?? existing?.enabled ?? false,
      credentials: input.credentials ?? existing?.credentials ?? {},
      webhookSecret: input.webhookSecret === undefined ? (existing?.webhookSecret ?? null) : input.webhookSecret,
      captureMode: input.captureMode ?? existing?.captureMode ?? 'automatic',
    };
    await this.methods.save(next);
    return ok(toPublicPaymentMethod(next));
  }
}
