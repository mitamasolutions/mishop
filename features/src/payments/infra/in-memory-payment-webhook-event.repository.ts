import { Injectable } from '@nestjs/common';
import type { PaymentWebhookEventProps } from '../domain/payment-webhook-event.entity';
import type { PaymentWebhookEventRepository } from '../domain/payment-webhook-event.repository';

@Injectable()
export class InMemoryPaymentWebhookEventRepository implements PaymentWebhookEventRepository {
  private readonly events = new Map<string, PaymentWebhookEventProps>();

  async claim(event: PaymentWebhookEventProps): Promise<boolean> {
    const key = this.key(event.storeId, event.providerCode, event.eventId);
    if (this.events.has(key)) return false;
    this.events.set(key, { ...event });
    return true;
  }

  async findByStoreProviderAndEventId(storeId: string, providerCode: string, eventId: string): Promise<PaymentWebhookEventProps | null> {
    return this.events.get(this.key(storeId, providerCode, eventId)) ?? null;
  }

  async save(event: PaymentWebhookEventProps): Promise<void> {
    this.events.set(this.key(event.storeId, event.providerCode, event.eventId), { ...event });
  }

  private key(storeId: string, providerCode: string, eventId: string): string {
    return `${storeId}::${providerCode}::${eventId}`;
  }
}
