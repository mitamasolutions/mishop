import { err, ok, type EventBus, type Result, type UseCase } from '@mitama/core';
import type { OrderPaymentStatus } from '../domain/order.entity';
import type { EmailQueue } from '../domain/email-queue';
import type { OrderReader, OrderWriter } from '../domain/order.repository';
import { InvalidPaymentStateTransitionError, OrderNotFoundError } from '../domain/errors';
import { toOrderOutput, type OrderOutput } from './order.dto';
import { outboxForPayment } from './order-events';

export class ChangePaymentStateUseCase
  implements UseCase<{ orderId: string; to: OrderPaymentStatus; actorId?: string | null; reason?: string | null }, Result<OrderOutput, OrderNotFoundError | InvalidPaymentStateTransitionError>>
{
  constructor(
    private readonly orderReader: OrderReader,
    private readonly orderWriter: OrderWriter,
    private readonly eventBus: EventBus,
    private readonly emailQueue: EmailQueue,
  ) {}

  async execute(input: { orderId: string; to: OrderPaymentStatus; actorId?: string | null; reason?: string | null }): Promise<Result<OrderOutput, OrderNotFoundError | InvalidPaymentStateTransitionError>> {
    const order = await this.orderReader.findById(input.orderId);
    if (!order) return err(new OrderNotFoundError(input.orderId));
    try {
      order.transitionPayment(input.to, input.actorId ?? null, input.reason ?? null);
    } catch (error) {
      return err(error as InvalidPaymentStateTransitionError);
    }
    await this.orderWriter.save(order, { outbox: outboxForPayment(order, input.to) });
    if (input.to === 'paid') {
      await this.emailQueue.enqueue({ orderId: order.id, templateCode: 'payment.paid', payload: { orderNumber: order.orderNumber } });
    }
    return ok(toOrderOutput(order));
  }
}
