import { Injectable, OnModuleInit } from '@nestjs/common';
import type { DomainEvent, EventBus } from '@mitama/core';
import type { OrderEventPayload } from '@mitama/contracts';
import type { VerifiedPurchaseRepository } from '../domain/review.repository';

const ORDER_VERIFIED_EVENT = 'order.completed';
const ORDER_REVOKE_EVENTS = ['order.refunded', 'order.cancelled'] as const;

/**
 * Proyecciona compras verificadas a partir de eventos de `orders`. Mantiene
 * el boundary entre módulos: nunca leemos su schema; sólo consumimos el
 * `OrderEventPayload` publicado por el bus.
 */
@Injectable()
export class OrderEventsHandler implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBus,
    private readonly purchases: VerifiedPurchaseRepository,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe(ORDER_VERIFIED_EVENT, (event) => this.record(event));
    for (const name of ORDER_REVOKE_EVENTS) {
      this.eventBus.subscribe(name, (event) => this.revoke(event));
    }
  }

  private async record(event: DomainEvent): Promise<void> {
    const payload = event.payload as OrderEventPayload | undefined;
    if (!payload?.orderId || !payload.productIds?.length) return;
    const entries = [...new Set(payload.productIds)].map((productId) => ({
      storeId: payload.storeId,
      customerId: payload.customerId,
      productId,
      orderId: payload.orderId,
    }));
    await this.purchases.record(entries);
  }

  private async revoke(event: DomainEvent): Promise<void> {
    const payload = event.payload as OrderEventPayload | undefined;
    if (!payload?.orderId || !payload?.storeId) return;
    await this.purchases.removeByOrder(payload.storeId, payload.orderId);
  }
}
