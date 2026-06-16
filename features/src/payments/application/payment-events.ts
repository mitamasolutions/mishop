import type { DomainEvent, EventBus } from '@mitama/core';
import type { Payment } from '../domain/payment.entity';

export async function publishPaymentEvent(eventBus: EventBus, payment: Payment): Promise<void> {
  if (payment.status === 'authorized') await eventBus.publish(paymentEvent('payment.authorized', payment));
  if (payment.status === 'paid') await eventBus.publish(paymentEvent('payment.paid', payment));
  if (payment.status === 'partially_refunded') await eventBus.publish(paymentEvent('payment.partially_refunded', payment));
  if (payment.status === 'refunded') await eventBus.publish(paymentEvent('payment.refunded', payment));
  if (payment.status === 'voided') await eventBus.publish(paymentEvent('payment.voided', payment));
  if (payment.status === 'failed') await eventBus.publish(paymentEvent('payment.failed', payment));
}

export function paymentEvent(name: string, payment: Payment, extra: Record<string, unknown> = {}): DomainEvent {
  return {
    name,
    occurredAt: new Date(),
    payload: {
      paymentId: payment.id,
      orderId: payment.orderId,
      storeId: payment.storeId,
      providerCode: payment.providerCode,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      ...extra,
    },
  };
}
