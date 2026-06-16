import type { OrderEventPayload } from '@mitama/contracts';
import { Order, type OrderPaymentStatus } from '../domain/order.entity';

export function eventPayload(order: Order): OrderEventPayload {
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    storeId: order.storeId,
    customerId: order.customerId,
    productIds: [...new Set(order.lines.map((line) => line.productId))],
  };
}

export function outboxForPayment(
  order: Order,
  to: OrderPaymentStatus,
): Array<{ name: string; payload: Record<string, unknown>; storeId?: string | null }> {
  const payload = eventPayload(order) as unknown as Record<string, unknown>;
  const events: Array<{ name: string; payload: Record<string, unknown>; storeId?: string | null }> = [];
  if (to === 'authorized') events.push({ name: 'payment.authorized', payload });
  if (to === 'paid') events.push({ name: 'payment.paid', payload });
  if (to === 'failed') events.push({ name: 'payment.failed', payload });
  if (to === 'refunded') events.push({ name: 'order.refunded', payload });
  if (to === 'partially_refunded') events.push({ name: 'payment.partially_refunded', payload });
  return events;
}
