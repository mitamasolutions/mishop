import type { Order, OrderPaymentStatus, OrderStatus } from './order.entity';
import type { OutboxEventInput } from './outbox';

export interface OrderFilter {
  storeId?: string;
  status?: OrderStatus;
  paymentStatus?: OrderPaymentStatus;
  customerId?: string;
  channel?: string;
  orderNumber?: string;
  /** Paginado server-side (r23 · sprint1_cierre). Default page=1, pageSize=20. */
  page?: number;
  pageSize?: number;
}

export interface PaginatedOrders {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StoredIdempotencyRecord {
  key: string;
  storeId: string;
  requestHash: string;
  orderId: string;
  expiresAt: Date;
}

export interface SaveOrderOptions {
  idempotency?: { key: string; requestHash: string; expiresAt: Date };
  /**
   * Eventos a persistir en la misma transacción que el save (outbox).
   * El worker los publica al EventBus después con reintentos controlados.
   */
  outbox?: OutboxEventInput[];
}

export interface OrderReader {
  findById(id: string): Promise<Order | null>;
  findAll(filter: OrderFilter): Promise<PaginatedOrders>;
}

export interface OrderIdempotencyReader {
  findIdempotency(storeId: string, key: string): Promise<StoredIdempotencyRecord | null>;
}

export interface OrderNumberGenerator {
  nextOrderNumber(storeId: string, prefix: string): Promise<string>;
}

export interface OrderWriter {
  save(order: Order, options?: SaveOrderOptions): Promise<void>;
  delete(orderId: string): Promise<void>;
}
