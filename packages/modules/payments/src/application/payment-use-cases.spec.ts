import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
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
import {
  InvalidWebhookSignatureError,
  OrderForPaymentNotFoundError,
  OrderNotPayableError,
  PaymentAmountExceedsOrderError,
  PaymentCurrencyMismatchError,
  PaymentMethodUnavailableError,
  PaymentNotRefundableError,
  PaymentStoreMismatchError,
  RefundAmountExceededError,
  TransientPaymentProviderError,
} from '../domain/errors';
import { InMemoryPaymentRepository } from '../infra/in-memory-payment.repository';
import { InMemoryPaymentWebhookEventRepository } from '../infra/in-memory-payment-webhook-event.repository';
import { InMemoryStorePaymentMethodRepository } from '../infra/in-memory-store-payment-method.repository';
import { ManualPaymentProvider } from '../infra/manual-payment.provider';
import { CredentialCipher } from '../infra/credential-cipher';
import {
  AuthorizePaymentUseCase,
  HandlePaymentWebhookUseCase,
  RefundPaymentUseCase,
  ResolveAvailablePaymentMethodsUseCase,
} from './payment-use-cases';

/**
 * Provider de prueba: simula un gateway externo con firma HMAC sobre el
 * rawBody y campo `transientFailure` para forzar reintentos. No es real,
 * pero ejerce el contrato `PaymentProvider` extendido (descriptor +
 * validateConfig) con la misma forma que MP/Stripe (r14 · sprint1_cierre).
 */
class TestPaymentProvider implements PaymentProvider {
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

class InMemoryOrderForPayments implements OrderForPaymentsPort {
  readonly orders = new Map<string, OrderForPaymentsView>();
  async findById(orderId: string): Promise<OrderForPaymentsView | null> {
    return this.orders.get(orderId) ?? null;
  }
}

const PER_TENANT_SECRET = 'per-tenant-secret';

describe('payment use cases (r14 · sprint1_cierre)', () => {
  function setup() {
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
    return {
      payments,
      webhooks,
      orders,
      methods,
      registry,
      authorize: new AuthorizePaymentUseCase(payments, methods, registry, orders, eventBus),
      webhook: new HandlePaymentWebhookUseCase(payments, webhooks, methods, registry, eventBus),
      refund: new RefundPaymentUseCase(payments, methods, registry, eventBus),
      resolveAvailable: new ResolveAvailablePaymentMethodsUseCase(methods, registry),
    };
  }

  it('procesa un webhook duplicado una sola vez', async () => {
    const { authorize, webhook } = setup();
    const payment = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'MXN' });
    const rawBody = JSON.stringify({ eventId: 'evt-1', paymentId: payment.value.id, status: 'paid' });
    const headers = { 'x-test-signature': sign(rawBody) };

    const first = await webhook.execute({ storeId: 'default', providerCode: 'test', headers, rawBody });
    const second = await webhook.execute({ storeId: 'default', providerCode: 'test', headers, rawBody });

    expect(first.isOk() && first.value.duplicate).toBe(false);
    expect(second.isOk() && second.value.duplicate).toBe(true);
  });

  it('NO colisiona el mismo eventId entre dos tiendas (unicidad por storeId)', async () => {
    const { authorize, methods, webhook } = setup();
    // Configura una segunda tienda con el mismo provider.
    void methods.save({
      id: 'store-b-test',
      storeId: 'store-b',
      providerCode: 'test',
      displayName: 'Test B',
      enabled: true,
      credentials: { apiKey: 'sk_test' },
      webhookSecret: PER_TENANT_SECRET,
      captureMode: 'automatic',
    });
    const paymentA = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'MXN' });
    // Crea una orden y pago para la tienda B.
    const setupB = setup();
    setupB.orders.orders.set('order-b', { id: 'order-b', storeId: 'store-b', currencyCode: 'MXN', total: 50, paidAmount: 0, paymentStatus: 'pending', status: 'pending' });
    void setupB.methods.save({
      id: 'store-b-test', storeId: 'store-b', providerCode: 'test', displayName: 'Test B', enabled: true,
      credentials: { apiKey: 'sk_test' }, webhookSecret: PER_TENANT_SECRET, captureMode: 'automatic',
    });
    const paymentB = await setupB.authorize.execute({ storeId: 'store-b', orderId: 'order-b', providerCode: 'test', amount: 50, currency: 'MXN' });

    const rawBodyA = JSON.stringify({ eventId: 'evt-shared', paymentId: paymentA.value.id, status: 'paid' });
    const rawBodyB = JSON.stringify({ eventId: 'evt-shared', paymentId: paymentB.value.id, status: 'paid' });
    const a = await webhook.execute({ storeId: 'default', providerCode: 'test', headers: { 'x-test-signature': sign(rawBodyA) }, rawBody: rawBodyA });
    const b = await setupB.webhook.execute({ storeId: 'store-b', providerCode: 'test', headers: { 'x-test-signature': sign(rawBodyB) }, rawBody: rawBodyB });

    expect(a.isOk() && a.value.duplicate).toBe(false);
    expect(b.isOk() && b.value.duplicate).toBe(false);
  });

  it('rechaza firma inválida sin mutar estado', async () => {
    const { authorize, webhook, payments } = setup();
    const payment = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'MXN' });
    const rawBody = JSON.stringify({ eventId: 'evt-1', paymentId: payment.value.id, status: 'failed' });

    const result = await webhook.execute({ storeId: 'default', providerCode: 'test', headers: { 'x-test-signature': 'bad' }, rawBody });
    const stored = await payments.findById(payment.value.id);

    expect(result.isErr() && result.error).toBeInstanceOf(InvalidWebhookSignatureError);
    expect(stored?.status).toBe('paid');
  });

  it('devuelve error transitorio para forzar reintento', async () => {
    const { authorize, webhook } = setup();
    const payment = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'MXN' });
    const rawBody = JSON.stringify({ eventId: 'evt-1', paymentId: payment.value.id, status: 'paid', transientFailure: true });

    const result = await webhook.execute({ storeId: 'default', providerCode: 'test', headers: { 'x-test-signature': sign(rawBody) }, rawBody });

    expect(result.isErr() && result.error).toBeInstanceOf(TransientPaymentProviderError);
  });

  it('ignora eventos antiguos que intentarían revertir estado', async () => {
    const { authorize, webhook, payments } = setup();
    const payment = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'MXN' });
    const rawBody = JSON.stringify({ eventId: 'evt-old', paymentId: payment.value.id, status: 'authorized', occurredAt: '2020-01-01T00:00:00.000Z' });

    const result = await webhook.execute({ storeId: 'default', providerCode: 'test', headers: { 'x-test-signature': sign(rawBody) }, rawBody });
    const stored = await payments.findById(payment.value.id);

    expect(result.isOk()).toBe(true);
    expect(stored?.status).toBe('paid');
  });

  it('rechaza reembolsos que exceden saldo cobrable', async () => {
    const { authorize, refund } = setup();
    const payment = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'MXN' });

    const result = await refund.execute({ paymentId: payment.value.id, amount: 101 });

    expect(result.isErr() && result.error).toBeInstanceOf(RefundAmountExceededError);
  });

  it('rechaza reembolso sobre pago pendiente', async () => {
    const { authorize, refund } = setup();
    const payment = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'manual', amount: 100, currency: 'MXN' });

    const result = await refund.execute({ paymentId: payment.value.id, amount: 10 });

    expect(result.isErr() && result.error).toBeInstanceOf(PaymentNotRefundableError);
  });

  it('rechaza autorización para una orden inexistente, distinta tienda o moneda', async () => {
    const { authorize } = setup();

    const notFound = await authorize.execute({ storeId: 'default', orderId: 'missing', providerCode: 'test', amount: 100, currency: 'MXN' });
    const wrongStore = await authorize.execute({ storeId: 'other', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'MXN' });
    const wrongCurrency = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'USD' });

    expect(notFound.isErr() && notFound.error).toBeInstanceOf(OrderForPaymentNotFoundError);
    expect(wrongStore.isErr() && wrongStore.error).toBeInstanceOf(PaymentStoreMismatchError);
    expect(wrongCurrency.isErr() && wrongCurrency.error).toBeInstanceOf(PaymentCurrencyMismatchError);
  });

  it('rechaza autorización por monto inválido o que excede el saldo pendiente', async () => {
    const { authorize } = setup();

    const negative = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 0, currency: 'MXN' });
    const tooLarge = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 150, currency: 'MXN' });

    expect(negative.isErr() && negative.error).toBeInstanceOf(PaymentAmountExceedsOrderError);
    expect(tooLarge.isErr() && tooLarge.error).toBeInstanceOf(PaymentAmountExceedsOrderError);
  });

  it('rechaza autorización si la orden ya está pagada o cancelada', async () => {
    const { authorize, orders } = setup();
    orders.orders.set('order-paid', { id: 'order-paid', storeId: 'default', currencyCode: 'MXN', total: 100, paidAmount: 100, paymentStatus: 'paid', status: 'confirmed' });

    const result = await authorize.execute({ storeId: 'default', orderId: 'order-paid', providerCode: 'test', amount: 100, currency: 'MXN' });

    expect(result.isErr() && result.error).toBeInstanceOf(OrderNotPayableError);
  });

  it('rechaza autorización si el método está mal configurado (sin webhookSecret/credenciales)', async () => {
    const { authorize, methods, resolveAvailable } = setup();
    // Re-guarda el método sin credenciales válidas: queda misconfigured.
    void methods.save({
      id: 'default-test', storeId: 'default', providerCode: 'test', displayName: 'Test', enabled: true,
      credentials: {}, webhookSecret: null, captureMode: 'automatic',
    });

    const result = await authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'MXN' });
    expect(result.isErr() && result.error).toBeInstanceOf(PaymentMethodUnavailableError);

    // Y en la lista del admin aparece como misconfigured con razón.
    const available = await resolveAvailable.execute('default');
    expect(available.isOk()).toBe(true);
    if (!available.isOk()) return;
    const testMethod = available.value.find((entry) => entry.method.providerCode === 'test');
    expect(testMethod?.status).toBe('misconfigured');
    expect(testMethod?.misconfigurationReason).toContain('Faltan');
  });
});

describe('CredentialCipher (AES-256-GCM)', () => {
  it('cifra y descifra JSON round-trip', () => {
    const cipher = new CredentialCipher('a-secret-of-sufficient-length-and-entropy');
    const original = { apiKey: 'sk_live_xxx', publicKey: 'pk_live_yyy' };
    const encrypted = cipher.encryptJson(original);
    expect(encrypted.startsWith('v1:')).toBe(true);
    expect(encrypted).not.toContain('sk_live_xxx');
    const decrypted = cipher.decryptJson<typeof original>(encrypted);
    expect(decrypted).toEqual(original);
  });

  it('detecta tampering (auth tag inválido)', () => {
    const cipher = new CredentialCipher('a-secret-of-sufficient-length-and-entropy');
    const encrypted = cipher.encrypt('hola');
    const [prefix, iv, tag, _ct] = encrypted.split(':');
    const tampered = [prefix, iv, tag, Buffer.from('xxx').toString('base64')].join(':');
    expect(() => cipher.decrypt(tampered)).toThrow();
    // Tag distinto:
    expect(() => cipher.decrypt(encrypted.replace(tag, Buffer.from('00'.repeat(16), 'hex').toString('base64')))).toThrow();
  });
});

function sign(rawBody: string): string {
  return createHmac('sha256', PER_TENANT_SECRET).update(rawBody).digest('hex');
}
