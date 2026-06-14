import type { Result } from '@mitama/core';
import type { InvalidWebhookSignatureError, TransientPaymentProviderError } from './errors';
import type { PaymentStatus } from './payment.entity';

export interface PaymentProviderConfig {
  encryptedCredentials?: string | null;
  webhookSecret?: string | null;
  captureMode?: 'manual' | 'automatic';
}

export interface PaymentProviderRequest {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  config: PaymentProviderConfig;
}

export interface PaymentProviderResult {
  providerReference: string;
  status: PaymentStatus;
  occurredAt: Date;
}

export interface PaymentWebhookRequest {
  providerCode: string;
  headers: Record<string, string | string[] | undefined>;
  rawBody: string;
  config?: PaymentProviderConfig;
}

export interface PaymentWebhookResult {
  eventId: string;
  paymentId: string;
  status: PaymentStatus;
  providerReference?: string | null;
  refundReference?: string | null;
  amount?: number | null;
  occurredAt: Date;
}

export interface PaymentProvider {
  readonly code: string;
  readonly displayName: string;
  authorize(input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error | TransientPaymentProviderError>>;
  capture(input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error | TransientPaymentProviderError>>;
  refund(input: PaymentProviderRequest & { refundId: string }): Promise<Result<PaymentProviderResult, Error | TransientPaymentProviderError>>;
  void(input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error | TransientPaymentProviderError>>;
  handleWebhook(input: PaymentWebhookRequest): Promise<Result<PaymentWebhookResult, InvalidWebhookSignatureError | TransientPaymentProviderError | Error>>;
}

export class PaymentProviderRegistry {
  private readonly providers = new Map<string, PaymentProvider>();

  constructor(providers: PaymentProvider[] = []) {
    providers.forEach((provider) => this.register(provider));
  }

  register(provider: PaymentProvider): void {
    if (this.providers.has(provider.code)) throw new Error(`Provider de pago duplicado: ${provider.code}`);
    this.providers.set(provider.code, provider);
  }

  get(code: string): PaymentProvider | null {
    return this.providers.get(code) ?? null;
  }

  list(): PaymentProvider[] {
    return [...this.providers.values()];
  }
}
