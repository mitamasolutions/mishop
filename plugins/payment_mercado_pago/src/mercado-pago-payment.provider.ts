import { createHmac, timingSafeEqual } from 'node:crypto';
import { ok, err, type Result } from '@mitama/core';
import {
  InvalidWebhookSignatureError,
  TransientPaymentProviderError,
  type DecryptedPaymentMethodConfig,
  type PaymentProvider,
  type PaymentProviderConfigDescriptor,
  type PaymentProviderConfigStatus,
  type PaymentProviderRequest,
  type PaymentProviderResult,
  type PaymentStatus,
  type PaymentWebhookRequest,
  type PaymentWebhookResult,
} from '@mitama/contracts';

// ----- Cliente de Mercado Pago (port + tipos) -------------------------------

/**
 * Puerto del cliente de Mercado Pago. La implementación real hace HTTP a
 * `api.mercadopago.com` con el `accessToken` del comercio; en tests se
 * inyecta un fake. Esto mantiene `MercadoPagoPaymentProvider` puro y
 * testeable, y deja el upgrade a la SDK oficial como un cambio aislado
 * (r14 · sprint1_cierre).
 */
export interface MercadoPagoClient {
  createPreference(input: {
    accessToken: string;
    paymentId: string;
    orderId: string;
    amount: number;
    currency: string;
  }): Promise<{ preferenceId: string; initPoint: string }>;
  refundPayment(input: { accessToken: string; providerPaymentId: string; amount: number; refundId: string }): Promise<{ refundId: string }>;
  /** Recupera el estado actual de un pago en MP por su id. */
  getPaymentStatus(input: { accessToken: string; providerPaymentId: string }): Promise<{ status: PaymentStatus; amount: number | null }>;
}

// ----- Provider -------------------------------------------------------------

type MercadoPagoCredentials = {
  accessToken?: string;
  publicKey?: string;
};

/**
 * Plugin **Mercado Pago — Checkout Pro** (r14 · sprint1_cierre).
 *
 * - `authorize`: crea una preferencia (link de pago) vía
 *   `MercadoPagoClient.createPreference` y guarda `providerReference` =
 *   preferenceId. El pago queda `pending` hasta que llegue el webhook.
 * - Captura inmediata (mode `sale`): no hay paso de captura separado; el
 *   pago pasa a `paid` al confirmarse por webhook. `capture` es no-op.
 * - `refund`: usa el cliente para reembolsar parcial o totalmente.
 * - `handleWebhook`: verifica firma HMAC-SHA256 con el manifiesto real de MP
 *   (`id:<data.id>;request-id:<reqId>;ts:<ts>;`) y consulta el estado actual
 *   del pago en MP antes de transicionar el payment local.
 */
export class MercadoPagoPaymentProvider implements PaymentProvider {
  readonly code: string = 'mercado-pago';
  readonly displayName: string = 'Mercado Pago';
  readonly configDescriptor: PaymentProviderConfigDescriptor = {
    fields: [
      { key: 'accessToken', label: 'Access token (privado)', type: 'secret', required: true, description: 'Access token del comercio. Mercado Pago > Developers > Credentials.' },
      { key: 'publicKey', label: 'Public key', type: 'string', required: true, description: 'Public key del comercio (no es secreta pero conviene gestionarla aquí).' },
    ],
  };

  constructor(private readonly client: MercadoPagoClient) {}

  validateConfig(config: DecryptedPaymentMethodConfig): PaymentProviderConfigStatus {
    const credentials = config.credentials as MercadoPagoCredentials;
    const missing: string[] = [];
    if (!credentials?.accessToken) missing.push('accessToken');
    if (!credentials?.publicKey) missing.push('publicKey');
    if (!config.webhookSecret) missing.push('webhookSecret');
    if (missing.length > 0) {
      return { state: 'misconfigured', missing, reason: `Faltan: ${missing.join(', ')}` };
    }
    if (config.captureMode !== 'automatic') {
      return { state: 'misconfigured', missing: ['captureMode'], reason: 'Checkout Pro opera con captura inmediata (sale). Configura captureMode=automatic.' };
    }
    return { state: 'configured' };
  }

  async authorize(input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error | TransientPaymentProviderError>> {
    const credentials = decryptedCredentials(input.config);
    if (!credentials?.accessToken) return err(new Error('Mercado Pago: falta accessToken'));
    try {
      const preference = await this.client.createPreference({
        accessToken: credentials.accessToken,
        paymentId: input.paymentId,
        orderId: input.orderId,
        amount: input.amount,
        currency: input.currency,
      });
      return ok({ providerReference: preference.preferenceId, status: 'pending', occurredAt: new Date() });
    } catch (error) {
      return err(toTransientOrError(error));
    }
  }

  async capture(input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error>> {
    // Checkout Pro captura en automático en el confirm de MP; no hay paso
    // separado. Devolvemos un no-op coherente con el current state.
    return ok({ providerReference: `mp_capture_noop_${input.paymentId}`, status: 'paid', occurredAt: new Date() });
  }

  async refund(input: PaymentProviderRequest & { refundId: string }): Promise<Result<PaymentProviderResult, Error | TransientPaymentProviderError>> {
    const credentials = decryptedCredentials(input.config);
    if (!credentials?.accessToken) return err(new Error('Mercado Pago: falta accessToken'));
    if (!input.providerReference) {
      return err(new Error('Mercado Pago: refund requiere providerReference (id de pago de MP)'));
    }
    const providerPaymentId = input.providerReference;
    try {
      const result = await this.client.refundPayment({
        accessToken: credentials.accessToken,
        providerPaymentId,
        amount: input.amount,
        refundId: input.refundId,
      });
      return ok({ providerReference: `mp_refund_${result.refundId}`, status: 'pending', occurredAt: new Date() });
    } catch (error) {
      return err(toTransientOrError(error));
    }
  }

  async void(_input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error>> {
    // MP no expone `void` en Checkout Pro; en la práctica se reembolsa.
    return err(new Error('Mercado Pago no soporta void en Checkout Pro; usa refund.'));
  }

  async handleWebhook(input: PaymentWebhookRequest): Promise<Result<PaymentWebhookResult, InvalidWebhookSignatureError | TransientPaymentProviderError | Error>> {
    const secret = input.config?.webhookSecret;
    if (!secret) return err(new InvalidWebhookSignatureError());
    let body: { type?: string; data?: { id?: string }; action?: string; live_mode?: boolean };
    try {
      body = JSON.parse(input.rawBody);
    } catch {
      return err(new Error('Mercado Pago webhook: body no es JSON válido'));
    }
    const providerPaymentId = body.data?.id;
    if (!providerPaymentId) return err(new Error('Mercado Pago webhook: falta data.id'));
    if (!verifyMercadoPagoSignature(input.headers, providerPaymentId, secret)) {
      return err(new InvalidWebhookSignatureError());
    }

    const credentials = decryptedCredentials(input.config);
    if (!credentials?.accessToken) return err(new Error('Mercado Pago: falta accessToken'));

    let paymentStatus: { status: PaymentStatus; amount: number | null };
    try {
      paymentStatus = await this.client.getPaymentStatus({
        accessToken: credentials.accessToken,
        providerPaymentId,
      });
    } catch (error) {
      return err(toTransientOrError(error));
    }

    // El payment local debe poder mapearse: en este MVP usamos el id de
    // MP como `providerReference`. El use case del módulo resuelve el
    // `Payment` por `providerReference` (no por id local).
    return ok({
      eventId: `${providerPaymentId}:${body.action ?? body.type ?? 'update'}`,
      paymentId: providerPaymentId, // se resuelve a Payment local vía providerReference
      status: paymentStatus.status,
      providerReference: providerPaymentId,
      amount: paymentStatus.amount,
      occurredAt: new Date(),
    });
  }
}

// ---- helpers ----

function decryptedCredentials(config: { credentials?: unknown } | undefined): MercadoPagoCredentials | null {
  if (!config) return null;
  // El use case inyecta `credentials` ya descifradas en `config` antes de
  // llamar al provider (el cipher vive en el repo/use case, no en el
  // plugin). Si no vinieron, fallamos.
  const candidate = (config as { credentials?: MercadoPagoCredentials }).credentials;
  return candidate ?? null;
}

function toTransientOrError(error: unknown): Error | TransientPaymentProviderError {
  if (error instanceof Error && /timeout|ECONNRESET|ETIMEDOUT|503|504/i.test(error.message)) {
    return new TransientPaymentProviderError();
  }
  return error instanceof Error ? error : new Error(String(error));
}

function verifyMercadoPagoSignature(
  headers: Record<string, string | string[] | undefined>,
  dataId: string,
  secret: string,
): boolean {
  const sigHeader = pickHeader(headers, 'x-signature');
  const requestId = pickHeader(headers, 'x-request-id');
  if (!sigHeader || !requestId) return false;

  // Formato MP: `ts=<unix>,v1=<hex>`
  const parts = sigHeader.split(',').map((p) => p.trim());
  const ts = parts.find((p) => p.startsWith('ts='))?.slice(3);
  const v1 = parts.find((p) => p.startsWith('v1='))?.slice(3);
  if (!ts || !v1) return false;

  const signedString = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(signedString).digest('hex');
  const aBuf = Buffer.from(v1, 'utf8');
  const bBuf = Buffer.from(expected, 'utf8');
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

function pickHeader(headers: Record<string, string | string[] | undefined>, name: string): string | null {
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
