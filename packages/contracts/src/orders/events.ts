import type { DomainEvent } from '@mitama/core';

export interface OrderEventPayload {
  orderId: string;
  orderNumber: string;
  storeId: string;
  customerId: string;
}

export type OrderCreatedEvent = DomainEvent<OrderEventPayload> & { name: 'order.created' };
export type PaymentAuthorizedEvent = DomainEvent<OrderEventPayload> & { name: 'payment.authorized' };
export type PaymentPaidEvent = DomainEvent<OrderEventPayload> & { name: 'payment.paid' };
export type OrderCompletedEvent = DomainEvent<OrderEventPayload> & { name: 'order.completed' };
export type OrderCancelledEvent = DomainEvent<OrderEventPayload> & { name: 'order.cancelled' };
export type OrderRefundedEvent = DomainEvent<OrderEventPayload> & { name: 'order.refunded' };

export type SalesDomainEvent =
  | OrderCreatedEvent
  | PaymentAuthorizedEvent
  | PaymentPaidEvent
  | OrderCompletedEvent
  | OrderCancelledEvent
  | OrderRefundedEvent;

export function orderEvent(name: SalesDomainEvent['name'], payload: OrderEventPayload): SalesDomainEvent {
  return { name, payload, occurredAt: new Date() } as SalesDomainEvent;
}
