import { createHmac } from 'node:crypto';
import { ok, err, InMemoryEventBus, type Result } from '@mitama/core';
import type { OrderForPaymentsPort, OrderForPaymentsView } from '@mitama/contracts';
import {
  PaymentProviderRegistry,
  type DecryptedPaymentMethodConfig,
  type PaymentProvider,
  type PaymentProviderConfigDescriptor,
  type PaymentProviderConfigStatus,
  type PaymentProviderRequest,
  type PaymentProviderResult,
  type PaymentWebhookRequest,
  type PaymentWebhookResult,
} from '../domain/payment-provider';
import { InvalidWebhookSignatureError, TransientPaymentProviderError } from '../domain/errors';
import { InMemoryPaymentRepository } from '../infra/in-memory-payment.repository';
import { InMemoryPaymentWebhookEventRepository } from '../infra/in-memory-payment-webhook-event.repository';
import { InMemoryStorePaymentMethodRepository } from '../infra/in-memory-store-payment-method.repository';
import { ManualPaymentProvider } from '@mitama/payment_manual';

export const PER_TENANT_SECRET = 'per-tenant-secret';

/**
 * Provider de prueba: simula un gateway externo con firma HMAC sobre el
 * rawBody y campo `transientFailure` para forzar reintentos. No es real,
 * pero ejerce el contrato `PaymentProvider` extendido (descriptor +
 * validateConfig) con la misma forma que MP/Stripe (r14 · sprint1_cierre).
 */
export class TestPaymentProvider implements PaymentProvider {
  readonly code = 'test';
  readonly displayName = 'Test gateway';
  readonly configDescriptor: PaymentProviderConfigDescriptor = {
    fields: [{ key: 'apiKey', label: 'API key', type: 'secret', required: true }],
  };

  validateConfig(config: DecryptedPaymentMethodConfig): PaymentProviderConfigStatus {
    const missing: string[] = [];
    if (!(config.credentials as { apiKey?: string }).apiKey) missing.push('apiKey');
    if (!config.webhookSecret) missing.push('webhookSecret');
    if (missing.length > 0) return { state: 'misconfigured', missing, reason: `Faltan: ${missing.join(', ')}` };
    return { state: 'configured' };
  }

  async authorize(input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error>> {
    return ok({ providerReference: `test_${input.paymentId}`, status: input.config.captureMode === 'manual' ? 'authorized' : 'paid', occurredAt: new Date() });
  }

  async capture(input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error>> {
    return ok({ providerReference: `test_${input.paymentId}`, status: 'paid', occurredAt: new Date() });
  }

  async refund(input: PaymentProviderRequest & { refundId: string }): Promise<Result<PaymentProviderResult, Error>> {
    return ok({ providerReference: `test_refund_${input.refundId}`, status: 'pending', occurredAt: new Date() });
  }

  async void(input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error>> {
    return ok({ providerReference: `test_void_${input.paymentId}`, status: 'voided', occurredAt: new Date() });
  }

  async handleWebhook(input: PaymentWebhookRequest): Promise<Result<PaymentWebhookResult, InvalidWebhookSignatureError | TransientPaymentProviderError | Error>> {
    const sig = input.headers['x-test-signature'];
    const received = Array.isArray(sig) ? sig[0] : sig;
    const expected = createHmac('sha256', input.config?.webhookSecret ?? '').update(input.rawBody).digest('hex');
    if (received !== expected) return err(new InvalidWebhookSignatureError());
    const body = JSON.parse(input.rawBody) as { eventId: string; paymentId: string; status: PaymentWebhookResult['status']; providerReference?: string; refundReference?: string; amount?: number; occurredAt?: string; transientFailure?: boolean };
    if (body.transientFailure) return err(new TransientPaymentProviderError());
    return ok({
      eventId: body.eventId,
      paymentId: body.paymentId,
      status: body.status,
      providerReference: body.providerReference ?? null,
      refundReference: body.refundReference ?? null,
      amount: body.amount ?? null,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
    });
  }
}

export class InMemoryOrderForPayments implements OrderForPaymentsPort {
  readonly orders = new Map<string, OrderForPaymentsView>();
  async findById(orderId: string): Promise<OrderForPaymentsView | null> {
    return this.orders.get(orderId) ?? null;
  }
}

/**
 * Contexto compartido por los tests de los casos de uso de `payments`: deja un
 * provider `test` y `manual` configurados per-tenant para la tienda `default`,
 * con una orden pagable `order-1`. Cada spec construye el caso de uso que ejerce.
 */
export function makeContext() {
  const payments = new InMemoryPaymentRepository();
  const methods = new InMemoryStorePaymentMethodRepository();
  // Reemplaza los seeds 'default' para tener el provider 'test'
  // configurado per-tenant con el secret correcto.
  methods.methods.clear();
  void methods.save({
    id: 'default-test',
    storeId: 'default',
    providerCode: 'test',
    displayName: 'Test',
    enabled: true,
    credentials: { apiKey: 'sk_test' },
    webhookSecret: PER_TENANT_SECRET,
    captureMode: 'automatic',
  });
  void methods.save({
    id: 'default-manual',
    storeId: 'default',
    providerCode: 'manual',
    displayName: 'Manual',
    enabled: true,
    credentials: {},
    webhookSecret: null,
    captureMode: 'manual',
  });
  const webhooks = new InMemoryPaymentWebhookEventRepository();
  const orders = new InMemoryOrderForPayments();
  orders.orders.set('order-1', { id: 'order-1', storeId: 'default', currencyCode: 'MXN', total: 100, paidAmount: 0, paymentStatus: 'pending', status: 'pending' });
  const registry = new PaymentProviderRegistry([new TestPaymentProvider(), new ManualPaymentProvider()]);
  const eventBus = new InMemoryEventBus();
  return { payments, webhooks, orders, methods, registry, eventBus };
}

export function sign(rawBody: string): string {
  return createHmac('sha256', PER_TENANT_SECRET).update(rawBody).digest('hex');
}
