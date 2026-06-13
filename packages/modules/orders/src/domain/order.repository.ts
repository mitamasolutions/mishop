import type { Order, OrderPaymentStatus, OrderStatus } from './order.entity';

export interface OrderFilter {
  storeId?: string;
  status?: OrderStatus;
  paymentStatus?: OrderPaymentStatus;
  customerId?: string;
  channel?: string;
  orderNumber?: string;
}

export interface StoredIdempotencyRecord {
  key: string;
  storeId: string;
  requestHash: string;
  orderId: string;
  expiresAt: Date;
}

export interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  findAll(filter: OrderFilter): Promise<Order[]>;
  findIdempotency(storeId: string, key: string): Promise<StoredIdempotencyRecord | null>;
  nextOrderNumber(storeId: string, prefix: string): Promise<string>;
  save(order: Order, idempotency?: { key: string; requestHash: string; expiresAt: Date }): Promise<void>;
}
