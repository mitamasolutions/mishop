import { err, ok, type EventBus, type Result, type UseCase } from '@mitama/core';
import type { PaymentReader, PaymentWriter } from '../domain/payment.repository';
import { InvalidPaymentTransitionError, PaymentNotFoundError } from '../domain/errors';
import { toPaymentOutput, type PaymentOutput } from './payment.dto';
import { paymentEvent, publishPaymentEvent } from './payment-events';
import type { PaymentUseCaseError } from './payment-use-case-error';

export class MarkManualPaymentPaidUseCase implements UseCase<{ paymentId: string; actorId: string }, Result<PaymentOutput, PaymentUseCaseError>> {
  constructor(
    private readonly paymentReader: PaymentReader,
    private readonly paymentWriter: PaymentWriter,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: { paymentId: string; actorId: string }): Promise<Result<PaymentOutput, PaymentUseCaseError>> {
    const payment = await this.paymentReader.findById(input.paymentId);
    if (!payment) return err(new PaymentNotFoundError(input.paymentId));
    try {
      payment.transition('paid', `Marcado manualmente por ${input.actorId}`);
    } catch (error) {
      return err(error as InvalidPaymentTransitionError);
    }
    await this.paymentWriter.save(payment);
    await this.eventBus.publish(paymentEvent('payment.manual_marked_paid', payment, { actorId: input.actorId }));
    await publishPaymentEvent(this.eventBus, payment);
    return ok(toPaymentOutput(payment));
  }
}
