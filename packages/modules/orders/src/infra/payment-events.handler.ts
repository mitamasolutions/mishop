import { Injectable, OnModuleInit } from '@nestjs/common';
import type { DomainEvent, EventBus } from '@mitama/core';
import type { EmailQueue } from '../domain/email-queue';
import type { OrderPaymentStatus } from '../domain/order.entity';
import type { OrderRepository } from '../domain/order.repository';
import type { StockReservationService } from '../domain/stock-reservation';

const PAYMENT_EVENT_STATUS: Record<string, OrderPaymentStatus> = {
  'payment.authorized': 'authorized',
  'payment.paid': 'paid',
  'payment.partially_refunded': 'partially_refunded',
  'payment.refunded': 'refunded',
  'payment.voided': 'voided',
  'payment.failed': 'failed',
};

@Injectable()
export class PaymentEventsHandler implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBus,
    private readonly orders: OrderRepository,
    private readonly emailQueue: EmailQueue,
    private readonly stockReservations: StockReservationService,
  ) {}

  onModuleInit(): void {
    for (const name of Object.keys(PAYMENT_EVENT_STATUS)) {
      this.eventBus.subscribe(name, (event) => this.handle(event));
    }
  }

  private async handle(event: DomainEvent): Promise<void> {
    const status = PAYMENT_EVENT_STATUS[event.name];
    const payload = event.payload as { orderId?: string };
    if (!status || !payload.orderId) return;
    const order = await this.orders.findById(payload.orderId);
    if (!order) return;
    let changed = false;
    try {
      changed = order.transitionPayment(status, null, `Evento ${event.name}`);
    } catch {
      return;
    }
    if (!changed) return;
    await this.orders.save(order);
    if (status === 'paid') {
      await this.stockReservations.consume(order.id);
      await this.emailQueue.enqueue({ orderId: order.id, templateCode: 'payment.paid', payload: { orderNumber: order.orderNumber } });
    }
    if (status === 'failed' || status === 'voided' || status === 'cancelled') {
      await this.stockReservations.release(order.id);
    }
    if (status === 'refunded') await this.emailQueue.enqueue({ orderId: order.id, templateCode: 'payment.refunded', payload: { orderNumber: order.orderNumber } });
  }
}
