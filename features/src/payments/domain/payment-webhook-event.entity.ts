export type PaymentWebhookEventStatus = 'received' | 'processed' | 'failed';

export interface PaymentWebhookEventProps {
  id: string;
  storeId: string;
  providerCode: string;
  eventId: string;
  rawBody: string;
  status: PaymentWebhookEventStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  createdAt: Date;
  processedAt: Date | null;
}

export class PaymentWebhookEvent {
  static create(input: { storeId: string; providerCode: string; eventId: string; rawBody: string }): PaymentWebhookEventProps {
    return {
      id: crypto.randomUUID(),
      storeId: input.storeId,
      providerCode: input.providerCode,
      eventId: input.eventId,
      rawBody: input.rawBody,
      status: 'received',
      attempts: 0,
      maxAttempts: 5,
      lastError: null,
      createdAt: new Date(),
      processedAt: null,
    };
  }
}
