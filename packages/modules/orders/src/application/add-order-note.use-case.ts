import { err, ok, type Result, type UseCase } from '@mitama/core';
import type { OrderReader, OrderWriter } from '../domain/order.repository';
import { OrderNotFoundError } from '../domain/errors';
import { toOrderOutput, type OrderOutput } from './order.dto';

export class AddOrderNoteUseCase implements UseCase<{ orderId: string; authorId: string; body: string }, Result<OrderOutput, OrderNotFoundError>> {
  constructor(
    private readonly orderReader: OrderReader,
    private readonly orderWriter: OrderWriter,
  ) {}

  async execute(input: { orderId: string; authorId: string; body: string }): Promise<Result<OrderOutput, OrderNotFoundError>> {
    const order = await this.orderReader.findById(input.orderId);
    if (!order) return err(new OrderNotFoundError(input.orderId));
    order.addNote(input.authorId, input.body);
    await this.orderWriter.save(order);
    return ok(toOrderOutput(order));
  }
}
