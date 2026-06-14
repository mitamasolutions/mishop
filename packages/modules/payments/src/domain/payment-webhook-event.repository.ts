import type { PaymentWebhookEventProps } from './payment-webhook-event.entity';

export interface PaymentWebhookEventRepository {
  claim(event: PaymentWebhookEventProps): Promise<boolean>;
  findByProviderAndEventId(providerCode: string, eventId: string): Promise<PaymentWebhookEventProps | null>;
  save(event: PaymentWebhookEventProps): Promise<void>;
}
