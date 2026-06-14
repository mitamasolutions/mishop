import { Order } from '../domain/order.entity';
import { IdempotencyConflictError, OrderAlreadyExistsForCartError } from '../domain/errors';
import type { OrderFilter, OrderRepository, StoredIdempotencyRecord } from '../domain/order.repository';

export class InMemoryOrderRepository implements OrderRepository {
  private readonly orders = new Map<string, Order>();
  private readonly idempotency = new Map<string, StoredIdempotencyRecord>();
  private readonly sequences = new Map<string, number>();

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null;
  }

  async findAll(filter: OrderFilter): Promise<Order[]> {
    return [...this.orders.values()].filter((order) => {
      if (filter.storeId && order.storeId !== filter.storeId) return false;
      if (filter.status && order.status !== filter.status) return false;
      if (filter.paymentStatus && order.paymentStatus !== filter.paymentStatus) return false;
      if (filter.customerId && order.customerId !== filter.customerId) return false;
      if (filter.channel && order.channel !== filter.channel) return false;
      if (filter.orderNumber && order.orderNumber !== filter.orderNumber) return false;
      return true;
    });
  }

  async findIdempotency(storeId: string, key: string): Promise<StoredIdempotencyRecord | null> {
    return this.idempotency.get(`${storeId}:${key}`) ?? null;
  }

  async nextOrderNumber(storeId: string, prefix: string): Promise<string> {
    const next = (this.sequences.get(storeId) ?? 0) + 1;
    this.sequences.set(storeId, next);
    return `${prefix}${String(next).padStart(6, '0')}`;
  }

  async save(order: Order, idempotency?: { key: string; requestHash: string; expiresAt: Date }): Promise<void> {
    const existing = [...this.orders.values()].find((stored) => stored.id !== order.id && stored.storeId === order.storeId && stored.cartId === order.cartId);
    if (existing) throw new OrderAlreadyExistsForCartError();

    this.orders.set(order.id, order);
    if (idempotency) {
      const existingKey = this.idempotency.get(`${order.storeId}:${idempotency.key}`);
      if (existingKey && existingKey.orderId !== order.id) throw new IdempotencyConflictError();

      this.idempotency.set(`${order.storeId}:${idempotency.key}`, {
        key: idempotency.key,
        storeId: order.storeId,
        requestHash: idempotency.requestHash,
        orderId: order.id,
        expiresAt: idempotency.expiresAt,
      });
    }
  }

  async delete(orderId: string): Promise<void> {
    this.orders.delete(orderId);
  }
}
