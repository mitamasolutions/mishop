import { err, ok, type Result, type UseCase } from '@mitama/core';
import type { EmailQueue } from '../domain/email-queue';
import type { OrderReader } from '../domain/order.repository';
import { OrderNotFoundError } from '../domain/errors';

export class ResendOrderConfirmationUseCase implements UseCase<string, Result<void, OrderNotFoundError>> {
  constructor(
    private readonly orders: OrderReader,
    private readonly emailQueue: EmailQueue,
  ) {}

  async execute(orderId: string): Promise<Result<void, OrderNotFoundError>> {
    const order = await this.orders.findById(orderId);
    if (!order) return err(new OrderNotFoundError(orderId));
    await this.emailQueue.enqueue({ orderId, templateCode: 'order.created', payload: { orderNumber: order.orderNumber } });
    return ok(undefined);
  }
}
