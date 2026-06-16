import { err, ok, type EventBus, type Result, type UseCase } from '@mitama/core';
import type { OrderStatus } from '../domain/order.entity';
import type { OrderReader, OrderWriter } from '../domain/order.repository';
import { InvalidOrderStateTransitionError, OrderNotFoundError } from '../domain/errors';
import { toOrderOutput, type OrderOutput } from './order.dto';
import { eventPayload } from './order-events';

export class ChangeOrderStateUseCase
  implements UseCase<{ orderId: string; to: OrderStatus; actorId?: string | null; reason?: string | null }, Result<OrderOutput, OrderNotFoundError | InvalidOrderStateTransitionError>>
{
  constructor(
    private readonly orderReader: OrderReader,
    private readonly orderWriter: OrderWriter,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: { orderId: string; to: OrderStatus; actorId?: string | null; reason?: string | null }): Promise<Result<OrderOutput, OrderNotFoundError | InvalidOrderStateTransitionError>> {
    const order = await this.orderReader.findById(input.orderId);
    if (!order) return err(new OrderNotFoundError(input.orderId));
    try {
      order.transitionOrder(input.to, input.actorId ?? null, input.reason ?? null);
    } catch (error) {
      return err(error as InvalidOrderStateTransitionError);
    }
    await this.orderWriter.save(order, {
      outbox: input.to === 'completed' ? [{ name: 'order.completed', payload: eventPayload(order) as unknown as Record<string, unknown> }] : undefined,
    });
    return ok(toOrderOutput(order));
  }
}
