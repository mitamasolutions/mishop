import { err, ok, type EventBus, type Result, type UseCase } from '@mitama/core';
import type { PaymentProviderRegistry } from '../domain/payment-provider';
import type { PaymentReader, PaymentWriter } from '../domain/payment.repository';
import type { StorePaymentMethodRepository } from '../domain/store-payment-method.repository';
import { toDecryptedConfig } from '../domain/store-payment-method.repository';
import { InvalidPaymentTransitionError, PaymentMethodUnavailableError, PaymentNotFoundError, PaymentProviderNotFoundError } from '../domain/errors';
import { toPaymentOutput, type PaymentOutput } from './payment.dto';
import { publishPaymentEvent } from './payment-events';
import type { PaymentUseCaseError } from './payment-use-case-error';

export class CapturePaymentUseCase implements UseCase<{ paymentId: string }, Result<PaymentOutput, PaymentUseCaseError>> {
  constructor(
    private readonly paymentReader: PaymentReader,
    private readonly paymentWriter: PaymentWriter,
    private readonly methods: StorePaymentMethodRepository,
    private readonly registry: PaymentProviderRegistry,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: { paymentId: string }): Promise<Result<PaymentOutput, PaymentUseCaseError>> {
    const payment = await this.paymentReader.findById(input.paymentId);
    if (!payment) return err(new PaymentNotFoundError(input.paymentId));
    const method = await this.methods.findEnabledByProvider(payment.storeId, payment.providerCode);
    if (!method) return err(new PaymentMethodUnavailableError(payment.providerCode));
    const provider = this.registry.get(payment.providerCode);
    if (!provider) return err(new PaymentProviderNotFoundError(payment.providerCode));
    const result = await provider.capture({ paymentId: payment.id, orderId: payment.orderId, amount: payment.amount, currency: payment.currency, config: toDecryptedConfig(method) });
    if (result.isErr()) return err(result.error);
    try {
      payment.setProviderReference(result.value.providerReference);
      payment.transition(result.value.status, 'Captura de provider', result.value.occurredAt);
    } catch (error) {
      return err(error as InvalidPaymentTransitionError);
    }
    await this.paymentWriter.save(payment);
    await publishPaymentEvent(this.eventBus, payment);
    return ok(toPaymentOutput(payment));
  }
}
