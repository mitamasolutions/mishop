import { err, ok, type EventBus, type Result, type UseCase } from '@mitama/core';
import type { PaymentProviderRegistry } from '../domain/payment-provider';
import type { PaymentReader, PaymentWriter } from '../domain/payment.repository';
import type { StorePaymentMethodRepository } from '../domain/store-payment-method.repository';
import { toDecryptedConfig } from '../domain/store-payment-method.repository';
import { PaymentMethodUnavailableError, PaymentNotFoundError, PaymentNotRefundableError, PaymentProviderNotFoundError, RefundAmountExceededError } from '../domain/errors';
import { toPaymentOutput, type PaymentOutput } from './payment.dto';
import { paymentEvent } from './payment-events';
import type { PaymentUseCaseError } from './payment-use-case-error';

export class RefundPaymentUseCase implements UseCase<{ paymentId: string; amount: number }, Result<PaymentOutput, PaymentUseCaseError>> {
  constructor(
    private readonly paymentReader: PaymentReader,
    private readonly paymentWriter: PaymentWriter,
    private readonly methods: StorePaymentMethodRepository,
    private readonly registry: PaymentProviderRegistry,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: { paymentId: string; amount: number }): Promise<Result<PaymentOutput, PaymentUseCaseError>> {
    const payment = await this.paymentReader.findById(input.paymentId);
    if (!payment) return err(new PaymentNotFoundError(input.paymentId));
    const method = await this.methods.findEnabledByProvider(payment.storeId, payment.providerCode);
    if (!method) return err(new PaymentMethodUnavailableError(payment.providerCode));
    const provider = this.registry.get(payment.providerCode);
    if (!provider) return err(new PaymentProviderNotFoundError(payment.providerCode));
    let refund;
    try {
      refund = payment.requestRefund(input.amount);
    } catch (error) {
      return err(error as RefundAmountExceededError | PaymentNotRefundableError);
    }
    const result = await provider.refund({
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: input.amount,
      currency: payment.currency,
      config: toDecryptedConfig(method),
      providerReference: payment.providerReference,
      refundId: refund.id,
    });
    if (result.isErr()) return err(result.error);
    payment.setRefundProviderReference(refund.id, result.value.providerReference);
    await this.paymentWriter.save(payment);
    await this.eventBus.publish(paymentEvent('payment.refund_requested', payment, { refundId: refund.id, amount: input.amount }));
    return ok(toPaymentOutput(payment));
  }
}
