import { Injectable, OnModuleInit } from '@nestjs/common';
import type { DomainEvent, EventBus } from '@mitama/core';
import type { EmailQueue } from '../domain/email-queue';
import type { TransactionalEmailTemplateCode } from '../domain/email-queue';

@Injectable()
export class ShipmentEventsHandler implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBus,
    private readonly emailQueue: EmailQueue,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe('shipment.notification_requested', (event) => this.handle(event));
  }

  private async handle(event: DomainEvent): Promise<void> {
    const payload = event.payload as { orderId?: string; status?: string; shipmentId?: string };
    if (!payload.orderId) return;
    const templateCode: TransactionalEmailTemplateCode = payload.status === 'delivered' ? 'shipment.delivered' : 'shipment.shipped';
    await this.emailQueue.enqueue({
      orderId: payload.orderId,
      templateCode,
      payload: { shipmentId: payload.shipmentId ?? null, status: payload.status ?? 'updated' },
    });
  }
}
