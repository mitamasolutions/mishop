import { err, ok, type EventBus, type Result, type UseCase } from '@mitama/core';
import type { EmailQueue } from '../domain/email-queue';
import type { OrderReader, OrderWriter } from '../domain/order.repository';
import type { StockReservationService } from '../domain/stock-reservation';
import { CompletedOrderCannotBeCancelledError, OrderNotFoundError } from '../domain/errors';
import { toOrderOutput, type OrderOutput } from './order.dto';
import { eventPayload } from './order-events';

export class CancelOrderUseCase implements UseCase<{ orderId: string; actorId?: string | null; reason?: string | null }, Result<OrderOutput, OrderNotFoundError | CompletedOrderCannotBeCancelledError>> {
  constructor(
    private readonly orderReader: OrderReader,
    private readonly orderWriter: OrderWriter,
    private readonly stockReservations: StockReservationService,
    private readonly eventBus: EventBus,
    private readonly emailQueue: EmailQueue,
  ) {}

  async execute(input: { orderId: string; actorId?: string | null; reason?: string | null }): Promise<Result<OrderOutput, OrderNotFoundError | CompletedOrderCannotBeCancelledError>> {
    const order = await this.orderReader.findById(input.orderId);
    if (!order) return err(new OrderNotFoundError(input.orderId));
    try {
      order.cancel(input.actorId ?? null, input.reason ?? null);
    } catch (error) {
      return err(error as CompletedOrderCannotBeCancelledError);
    }
    await this.stockReservations.release(order.id);
    await this.orderWriter.save(order, { outbox: [{ name: 'order.cancelled', payload: eventPayload(order) as unknown as Record<string, unknown> }] });
    await this.emailQueue.enqueue({ orderId: order.id, templateCode: 'order.cancelled', payload: { orderNumber: order.orderNumber } });
    return ok(toOrderOutput(order));
  }
}
