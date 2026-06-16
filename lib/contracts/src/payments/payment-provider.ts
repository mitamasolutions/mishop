import type { Result } from '@mitama/core';
import type { InvalidWebhookSignatureError, TransientPaymentProviderError } from './errors';
import type { PaymentStatus } from './payment-status';

export interface PaymentProviderConfig {
  /** Secretos descifrados del método (accessToken, publicKey, etc.). */
  credentials?: Record<string, unknown>;
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

/**
 * Descriptor de configuración de un plugin de pago.
 * Lo consume la UI del admin para renderizar el formulario y el use case
 * `ResolveAvailablePaymentMethods` para decidir si un método está
 * `configured` o `misconfigured`.
 */
export interface PaymentProviderConfigFieldDescriptor {
  key: string;
  label: string;
  /** `secret` se enmascara en UI y nunca se devuelve descifrado al cliente. */
  type: 'string' | 'secret' | 'boolean';
  required: boolean;
  description?: string;
}

export interface PaymentProviderConfigDescriptor {
  fields: PaymentProviderConfigFieldDescriptor[];
}

export type PaymentProviderConfigStatus =
  | { state: 'configured' }
  | { state: 'misconfigured'; missing: string[]; reason: string };

/**
 * Configuración descifrada de un método de tienda (después de aplicar
 * `CredentialCipher` al `encryptedCredentials`).
 */
export interface DecryptedPaymentMethodConfig {
  webhookSecret: string | null;
  captureMode: 'manual' | 'automatic';
  credentials: Record<string, unknown>;
}

/**
 * Contrato que TODO plugin de pago implementa. Vive en `@mitama/contracts`
 * para que el módulo `payments` y los plugins (`@mitama/payment_*`) compartan
 * el mismo tipo sin acoplarse.
 */
export interface PaymentProvider {
  readonly code: string;
  readonly displayName: string;
  readonly configDescriptor: PaymentProviderConfigDescriptor;
  validateConfig(config: DecryptedPaymentMethodConfig): PaymentProviderConfigStatus;
  authorize(input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error | TransientPaymentProviderError>>;
  capture(input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error | TransientPaymentProviderError>>;
  refund(input: PaymentProviderRequest & { refundId: string }): Promise<Result<PaymentProviderResult, Error | TransientPaymentProviderError>>;
  void(input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error | TransientPaymentProviderError>>;
  handleWebhook(input: PaymentWebhookRequest): Promise<Result<PaymentWebhookResult, InvalidWebhookSignatureError | TransientPaymentProviderError | Error>>;
}
