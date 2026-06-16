import { ok, type Result, type UseCase } from '@mitama/core';
import type { OrderFilter, OrderReader } from '../domain/order.repository';
import { toOrderOutput, type OrderOutput } from './order.dto';

export interface PaginatedOrderOutput {
  items: OrderOutput[];
  total: number;
  page: number;
  pageSize: number;
}

export class ListOrdersUseCase implements UseCase<OrderFilter, Result<PaginatedOrderOutput, never>> {
  constructor(private readonly orders: OrderReader) {}

  async execute(filter: OrderFilter): Promise<Result<PaginatedOrderOutput, never>> {
    const result = await this.orders.findAll(filter);
    return ok({ ...result, items: result.items.map(toOrderOutput) });
  }
}
