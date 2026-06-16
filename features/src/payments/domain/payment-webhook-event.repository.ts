import type { PaymentWebhookEventProps } from './payment-webhook-event.entity';

export interface PaymentWebhookEventRepository {
  /**
   * Inserta el evento si la tripleta `(storeId, providerCode, eventId)` no
   * existe. Devuelve `true` si fue insertado; `false` si ya existía
   * (idempotencia por tienda — r14 · sprint1_cierre).
   */
  claim(event: PaymentWebhookEventProps): Promise<boolean>;
  findByStoreProviderAndEventId(storeId: string, providerCode: string, eventId: string): Promise<PaymentWebhookEventProps | null>;
  save(event: PaymentWebhookEventProps): Promise<void>;
}
