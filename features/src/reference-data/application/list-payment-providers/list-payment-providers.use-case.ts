import { ok, Result, UseCase } from '@mitama/core';
import type { PaymentProviderRepository } from '../../domain/payment-provider.repository';
import type { PaymentProviderOutput } from './list-payment-providers.dto';

export class ListPaymentProvidersUseCase
  implements UseCase<void, Result<PaymentProviderOutput[], never>>
{
  constructor(private readonly paymentProviders: PaymentProviderRepository) {}

  async execute(): Promise<Result<PaymentProviderOutput[], never>> {
    const all = await this.paymentProviders.findAll();
    return ok(
      all.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
      })),
    );
  }
}
