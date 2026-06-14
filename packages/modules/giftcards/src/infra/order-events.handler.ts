import { Injectable, OnModuleInit } from '@nestjs/common';
import type { DomainEvent, EventBus } from '@mitama/core';
import type { OrderEventPayload } from '@mitama/contracts';
import type { ReleaseGiftCardForOrderUseCase } from '../application/gift-card-use-cases';

const RELEASE_EVENTS = ['order.cancelled', 'order.refunded'] as const;

/**
 * Restituye saldo de gift card al cancelar o reembolsar la orden asociada.
 * La idempotencia vive en infra (campo `reversedAt` en `GiftCardRedemption`)
 * → emitir el mismo evento dos veces no duplica la restitución.
 */
@Injectable()
export class OrderEventsHandler implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBus,
    private readonly release: ReleaseGiftCardForOrderUseCase,
  ) {}

  onModuleInit(): void {
    for (const name of RELEASE_EVENTS) {
      this.eventBus.subscribe(name, (event) => this.handle(event));
    }
  }

  private async handle(event: DomainEvent): Promise<void> {
    const payload = event.payload as OrderEventPayload | undefined;
    if (!payload?.orderId || !payload?.storeId) return;
    await this.release.execute({ storeId: payload.storeId, orderId: payload.orderId });
  }
}
