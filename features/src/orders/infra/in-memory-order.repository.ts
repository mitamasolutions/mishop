import { Order } from '../domain/order.entity';
import { IdempotencyConflictError, OrderAlreadyExistsForCartError } from '../domain/errors';
import type { OrderFilter, OrderIdempotencyReader, OrderNumberGenerator, OrderReader, OrderWriter, SaveOrderOptions, StoredIdempotencyRecord } from '../domain/order.repository';
import type { OutboxEventInput } from '../domain/outbox';

export class InMemoryOrderRepository implements OrderReader, OrderIdempotencyReader, OrderNumberGenerator, OrderWriter {
  private readonly orders = new Map<string, Order>();
  private readonly idempotency = new Map<string, StoredIdempotencyRecord>();
  private readonly sequences = new Map<string, number>();
  readonly outbox: Array<OutboxEventInput & { id: string; storeId: string }> = [];

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null;
  }

  async findAll(filter: OrderFilter): Promise<{ items: Order[]; total: number; page: number; pageSize: number }> {
    const filtered = [...this.orders.values()].filter((order) => {
      if (filter.storeId && order.storeId !== filter.storeId) return false;
      if (filter.status && order.status !== filter.status) return false;
      if (filter.paymentStatus && order.paymentStatus !== filter.paymentStatus) return false;
      if (filter.customerId && order.customerId !== filter.customerId) return false;
      if (filter.channel && order.channel !== filter.channel) return false;
      if (filter.orderNumber && !order.orderNumber.toLowerCase().includes(filter.orderNumber.toLowerCase())) return false;
      return true;
    });
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const pageSize = filter.pageSize && filter.pageSize > 0 ? filter.pageSize : 20;
    const start = (page - 1) * pageSize;
    return { items: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize };
  }

  async findIdempotency(storeId: string, key: string): Promise<StoredIdempotencyRecord | null> {
    return this.idempotency.get(`${storeId}:${key}`) ?? null;
  }

  async nextOrderNumber(storeId: string, prefix: string): Promise<string> {
    const next = (this.sequences.get(storeId) ?? 0) + 1;
    this.sequences.set(storeId, next);
    return `${prefix}${String(next).padStart(6, '0')}`;
  }

  async save(order: Order, options: SaveOrderOptions = {}): Promise<void> {
    const existing = [...this.orders.values()].find((stored) => stored.id !== order.id && stored.storeId === order.storeId && stored.cartId === order.cartId);
    if (existing) throw new OrderAlreadyExistsForCartError();

    this.orders.set(order.id, order);
    if (options.idempotency) {
      const existingKey = this.idempotency.get(`${order.storeId}:${options.idempotency.key}`);
      if (existingKey && existingKey.orderId !== order.id) throw new IdempotencyConflictError();

      this.idempotency.set(`${order.storeId}:${options.idempotency.key}`, {
        key: options.idempotency.key,
        storeId: order.storeId,
        requestHash: options.idempotency.requestHash,
        orderId: order.id,
        expiresAt: options.idempotency.expiresAt,
      });
    }
    if (options.outbox && options.outbox.length > 0) {
      for (const event of options.outbox) {
        this.outbox.push({ id: crypto.randomUUID(), storeId: event.storeId ?? order.storeId, name: event.name, payload: event.payload });
      }
    }
  }

  async delete(orderId: string): Promise<void> {
    this.orders.delete(orderId);
  }
}
