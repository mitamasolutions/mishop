import { Injectable } from '@nestjs/common';
import type { PaymentWebhookEventProps } from '../domain/payment-webhook-event.entity';
import type { PaymentWebhookEventRepository } from '../domain/payment-webhook-event.repository';

@Injectable()
export class InMemoryPaymentWebhookEventRepository implements PaymentWebhookEventRepository {
  private readonly events = new Map<string, PaymentWebhookEventProps>();

  async claim(event: PaymentWebhookEventProps): Promise<boolean> {
    const key = `${event.providerCode}:${event.eventId}`;
    if (this.events.has(key)) return false;
    this.events.set(key, { ...event });
    return true;
  }

  async findByProviderAndEventId(providerCode: string, eventId: string): Promise<PaymentWebhookEventProps | null> {
    return this.events.get(`${providerCode}:${eventId}`) ?? null;
  }

  async save(event: PaymentWebhookEventProps): Promise<void> {
    this.events.set(`${event.providerCode}:${event.eventId}`, { ...event });
  }
}
