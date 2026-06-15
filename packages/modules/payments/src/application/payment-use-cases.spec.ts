import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { InMemoryEventBus } from '@mitama/core';
import type { OrderForPaymentsPort, OrderForPaymentsView } from '@mitama/contracts';
import { PaymentProviderRegistry } from '../domain/payment-provider';
import type { PaymentProviderConfigResolver } from '../domain/payment-provider-config-resolver';
import {
  InvalidWebhookSignatureError,
  OrderForPaymentNotFoundError,
  OrderNotPayableError,
  PaymentAmountExceedsOrderError,
  PaymentCurrencyMismatchError,
  PaymentNotRefundableError,
  PaymentStoreMismatchError,
  RefundAmountExceededError,
  TransientPaymentProviderError,
} from '../domain/errors';
import { InMemoryPaymentRepository } from '../infra/in-memory-payment.repository';
import { InMemoryPaymentWebhookEventRepository } from '../infra/in-memory-payment-webhook-event.repository';
import { InMemoryStorePaymentMethodRepository } from '../infra/in-memory-store-payment-method.repository';
import { ManualPaymentProvider, StripePaymentProvider } from '../infra/simulated-payment-providers';
import { AuthorizePaymentUseCase, HandlePaymentWebhookUseCase, RefundPaymentUseCase } from './payment-use-cases';

class InMemoryOrderForPayments implements OrderForPaymentsPort {
  readonly orders = new Map<string, OrderForPaymentsView>();
  async findById(orderId: string): Promise<OrderForPaymentsView | null> {
    return this.orders.get(orderId) ?? null;
  }
}

describe('payment webhooks', () => {
  function setup() {
    const payments = new InMemoryPaymentRepository();
    const methods = new InMemoryStorePaymentMethodRepository();
    const webhooks = new InMemoryPaymentWebhookEventRepository();
    const orders = new InMemoryOrderForPayments();
    orders.orders.set('order-1', { id: 'order-1', storeId: 'default', currencyCode: 'MXN', total: 100, paidAmount: 0, paymentStatus: 'pending', status: 'pending' });
    const registry = new PaymentProviderRegistry([new StripePaymentProvider(), new ManualPaymentProvider()]);
    const eventBus = new InMemoryEventBus();
    const configResolver: PaymentProviderConfigResolver = { getWebhookSecret: () => 'platform-secret' };
    return {
      payments,
      webhooks,
      orders,
      authorize: new AuthorizePaymentUseCase(payments, methods, registry, orders, eventBus),
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

  it('rechaza autorización para una orden inexistente, distinta tienda o moneda', async () => {
    const { authorize } = setup();

    const notFound = await authorize.execute({ storeId: 'default', orderId: 'missing', providerCode: 'stripe', amount: 100, currency: 'MXN' });
    const wrongStore = await authorize.execute({ storeId: 'other', orderId: 'order-1', providerCode: 'stripe', amount: 100, currency: 'MXN' });
    const wrongCurrency = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'stripe', amount: 100, currency: 'USD' });

    expect(notFound.isErr() && notFound.error).toBeInstanceOf(OrderForPaymentNotFoundError);
    expect(wrongStore.isErr() && wrongStore.error).toBeInstanceOf(PaymentStoreMismatchError);
    expect(wrongCurrency.isErr() && wrongCurrency.error).toBeInstanceOf(PaymentCurrencyMismatchError);
  });

  it('rechaza autorización por monto inválido o que excede el saldo pendiente', async () => {
    const { authorize } = setup();

    const negative = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'stripe', amount: 0, currency: 'MXN' });
    const tooLarge = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'stripe', amount: 150, currency: 'MXN' });

    expect(negative.isErr() && negative.error).toBeInstanceOf(PaymentAmountExceedsOrderError);
    expect(tooLarge.isErr() && tooLarge.error).toBeInstanceOf(PaymentAmountExceedsOrderError);
  });

  it('rechaza autorización si la orden ya está pagada o cancelada', async () => {
    const { authorize, orders } = setup();
    orders.orders.set('order-paid', { id: 'order-paid', storeId: 'default', currencyCode: 'MXN', total: 100, paidAmount: 100, paymentStatus: 'paid', status: 'confirmed' });

    const result = await authorize.execute({ storeId: 'default', orderId: 'order-paid', providerCode: 'stripe', amount: 100, currency: 'MXN' });

    expect(result.isErr() && result.error).toBeInstanceOf(OrderNotPayableError);
  });
});

function sign(rawBody: string): string {
  return createHmac('sha256', 'platform-secret').update(rawBody).digest('hex');
}
