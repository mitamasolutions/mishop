import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { InMemoryEventBus } from '@mitama/core';
import { PaymentProviderRegistry } from '../domain/payment-provider';
import type { PaymentProviderConfigResolver } from '../domain/payment-provider-config-resolver';
import { RefundAmountExceededError, InvalidWebhookSignatureError, PaymentNotRefundableError, TransientPaymentProviderError } from '../domain/errors';
import { InMemoryPaymentRepository } from '../infra/in-memory-payment.repository';
import { InMemoryPaymentWebhookEventRepository } from '../infra/in-memory-payment-webhook-event.repository';
import { InMemoryStorePaymentMethodRepository } from '../infra/in-memory-store-payment-method.repository';
import { ManualPaymentProvider, StripePaymentProvider } from '../infra/simulated-payment-providers';
import { AuthorizePaymentUseCase, HandlePaymentWebhookUseCase, RefundPaymentUseCase } from './payment-use-cases';

describe('payment webhooks', () => {
  function setup() {
    const payments = new InMemoryPaymentRepository();
    const methods = new InMemoryStorePaymentMethodRepository();
    const webhooks = new InMemoryPaymentWebhookEventRepository();
    const registry = new PaymentProviderRegistry([new StripePaymentProvider(), new ManualPaymentProvider()]);
    const eventBus = new InMemoryEventBus();
    const configResolver: PaymentProviderConfigResolver = { getWebhookSecret: () => 'platform-secret' };
    return {
      payments,
      webhooks,
      authorize: new AuthorizePaymentUseCase(payments, methods, registry, eventBus),
      webhook: new HandlePaymentWebhookUseCase(payments, webhooks, registry, configResolver, eventBus),
      refund: new RefundPaymentUseCase(payments, methods, registry, eventBus),
    };
  }

  it('procesa un webhook duplicado una sola vez', async () => {
    const { authorize, webhook } = setup();
    const payment = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'stripe', amount: 100, currency: 'MXN' });
    expect(payment.isOk()).toBe(true);
    const rawBody = JSON.stringify({ eventId: 'evt-1', paymentId: payment.value.id, status: 'paid' });
    const headers = { 'x-mitama-signature': sign(rawBody) };

    const first = await webhook.execute({ providerCode: 'stripe', headers, rawBody });
    const second = await webhook.execute({ providerCode: 'stripe', headers, rawBody });

    expect(first.isOk() && first.value.duplicate).toBe(false);
    expect(second.isOk() && second.value.duplicate).toBe(true);
  });

  it('rechaza firma inválida sin mutar estado', async () => {
    const { authorize, webhook, payments } = setup();
    const payment = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'stripe', amount: 100, currency: 'MXN' });
    const rawBody = JSON.stringify({ eventId: 'evt-1', paymentId: payment.value.id, status: 'failed' });

    const result = await webhook.execute({ providerCode: 'stripe', headers: { 'x-mitama-signature': 'bad' }, rawBody });
    const stored = await payments.findById(payment.value.id);

    expect(result.isErr() && result.error).toBeInstanceOf(InvalidWebhookSignatureError);
    expect(stored?.status).toBe('paid');
  });

  it('devuelve error transitorio para forzar reintento', async () => {
    const { authorize, webhook } = setup();
    const payment = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'stripe', amount: 100, currency: 'MXN' });
    const rawBody = JSON.stringify({ eventId: 'evt-1', paymentId: payment.value.id, status: 'paid', transientFailure: true });

    const result = await webhook.execute({ providerCode: 'stripe', headers: { 'x-mitama-signature': sign(rawBody) }, rawBody });

    expect(result.isErr() && result.error).toBeInstanceOf(TransientPaymentProviderError);
  });

  it('contabiliza webhooks transitorios y falla al superar el máximo de reintentos', async () => {
    const { authorize, webhook, webhooks } = setup();
    const payment = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'stripe', amount: 100, currency: 'MXN' });
    const rawBody = JSON.stringify({ eventId: 'evt-retry', paymentId: payment.value.id, status: 'paid', transientFailure: true });

    for (let index = 0; index < 5; index += 1) {
      const result = await webhook.execute({ providerCode: 'stripe', headers: { 'x-mitama-signature': sign(rawBody) }, rawBody });
      expect(result.isErr() && result.error).toBeInstanceOf(TransientPaymentProviderError);
    }
    const final = await webhook.execute({ providerCode: 'stripe', headers: { 'x-mitama-signature': sign(rawBody) }, rawBody });
    const stored = await webhooks.findByProviderAndEventId('stripe', 'evt-retry');

    expect(final.isErr() && final.error).not.toBeInstanceOf(TransientPaymentProviderError);
    expect(stored?.status).toBe('failed');
    expect(stored?.attempts).toBe(6);
  });

  it('ignora eventos antiguos que intentarían revertir estado', async () => {
    const { authorize, webhook, payments } = setup();
    const payment = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'stripe', amount: 100, currency: 'MXN' });
    const rawBody = JSON.stringify({ eventId: 'evt-old', paymentId: payment.value.id, status: 'authorized', occurredAt: '2020-01-01T00:00:00.000Z' });

    const result = await webhook.execute({ providerCode: 'stripe', headers: { 'x-mitama-signature': sign(rawBody) }, rawBody });
    const stored = await payments.findById(payment.value.id);

    expect(result.isOk()).toBe(true);
    expect(stored?.status).toBe('paid');
  });

  it('rechaza reembolsos que exceden saldo cobrable', async () => {
    const { authorize, refund } = setup();
    const payment = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'stripe', amount: 100, currency: 'MXN' });

    const result = await refund.execute({ paymentId: payment.value.id, amount: 101 });

    expect(result.isErr() && result.error).toBeInstanceOf(RefundAmountExceededError);
  });

  it('rechaza reembolso sobre pago pendiente', async () => {
    const { authorize, refund } = setup();
    const payment = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'manual', amount: 100, currency: 'MXN' });

    const result = await refund.execute({ paymentId: payment.value.id, amount: 10 });

    expect(result.isErr() && result.error).toBeInstanceOf(PaymentNotRefundableError);
  });

  it('correlaciona webhook de reembolso con la referencia correcta', async () => {
    const { authorize, refund, webhook, payments } = setup();
    const payment = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'stripe', amount: 100, currency: 'MXN' });
    await refund.execute({ paymentId: payment.value.id, amount: 30 });
    const secondRefund = await refund.execute({ paymentId: payment.value.id, amount: 20 });
    const refundReference = secondRefund.value.refunds[1]?.providerReference;
    const rawBody = JSON.stringify({ eventId: 'evt-refund', paymentId: payment.value.id, status: 'partially_refunded', refundReference, amount: 20 });

    const result = await webhook.execute({ providerCode: 'stripe', headers: { 'x-mitama-signature': sign(rawBody) }, rawBody });
    const stored = await payments.findById(payment.value.id);

    expect(result.isOk()).toBe(true);
    expect(stored?.refunds[0]?.status).toBe('pending');
    expect(stored?.refunds[1]?.status).toBe('succeeded');
    expect(stored?.status).toBe('partially_refunded');
  });

  it('registra reembolso externo sin pendiente y mueve a refunded', async () => {
    const { authorize, webhook, payments } = setup();
    const payment = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'stripe', amount: 100, currency: 'MXN' });
    const rawBody = JSON.stringify({ eventId: 'evt-external-refund', paymentId: payment.value.id, status: 'refunded', refundReference: 'provider-refund-1', amount: 100 });

    const result = await webhook.execute({ providerCode: 'stripe', headers: { 'x-mitama-signature': sign(rawBody) }, rawBody });
    const stored = await payments.findById(payment.value.id);

    expect(result.isOk()).toBe(true);
    expect(stored?.refunds).toHaveLength(1);
    expect(stored?.refunds[0]?.status).toBe('succeeded');
    expect(stored?.status).toBe('refunded');
  });

  it('procesa una sola vez webhooks duplicados concurrentes', async () => {
    const { authorize, webhook, payments } = setup();
    const payment = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'stripe', amount: 100, currency: 'MXN' });
    const rawBody = JSON.stringify({ eventId: 'evt-race', paymentId: payment.value.id, status: 'failed' });
    const headers = { 'x-mitama-signature': sign(rawBody) };

    const results = await Promise.all([
      webhook.execute({ providerCode: 'stripe', headers, rawBody }),
      webhook.execute({ providerCode: 'stripe', headers, rawBody }),
    ]);
    const stored = await payments.findById(payment.value.id);

    expect(results.filter((result) => result.isOk() && result.value.duplicate)).toHaveLength(1);
    expect(stored?.transitions.filter((transition) => transition.to === 'failed')).toHaveLength(1);
  });
});

function sign(rawBody: string): string {
  return createHmac('sha256', 'platform-secret').update(rawBody).digest('hex');
}
