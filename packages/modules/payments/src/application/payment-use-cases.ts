import { err, ok, type EventBus, type Result, type UseCase } from '@mitama/core';
import type { DomainEvent } from '@mitama/core';
import type { OrderForPaymentsPort } from '@mitama/contracts';
import { Payment } from '../domain/payment.entity';
import { PaymentWebhookEvent } from '../domain/payment-webhook-event.entity';
import type { PaymentProviderRegistry } from '../domain/payment-provider';
import type { PaymentRepository } from '../domain/payment.repository';
import type { PaymentWebhookEventRepository } from '../domain/payment-webhook-event.repository';
import type { PublicStorePaymentMethod, StorePaymentMethod, StorePaymentMethodRepository } from '../domain/store-payment-method.repository';
import { toDecryptedConfig, toPublicPaymentMethod } from '../domain/store-payment-method.repository';
import {
  DuplicateWebhookEventError,
  InvalidPaymentTransitionError,
  InvalidWebhookSignatureError,
  OrderForPaymentNotFoundError,
  OrderNotPayableError,
  PaymentAmountExceedsOrderError,
  PaymentCurrencyMismatchError,
  PaymentMethodUnavailableError,
  PaymentNotFoundError,
  PaymentNotRefundableError,
  PaymentProviderNotFoundError,
  PaymentStoreMismatchError,
  RefundAmountExceededError,
  TransientPaymentProviderError,
} from '../domain/errors';
import { toPaymentOutput, type PaymentOutput } from './payment.dto';

/**
 * Lista pagos por orden (para tab de Pagos en admin · r23 sprint1_cierre).
 */
export class ListPaymentsByOrderUseCase implements UseCase<string, Result<PaymentOutput[], never>> {
  constructor(private readonly payments: PaymentRepository) {}
  async execute(orderId: string): Promise<Result<PaymentOutput[], never>> {
    const items = await this.payments.findByOrderId(orderId);
    return ok(items.map(toPaymentOutput));
  }
}

/**
 * Configura/actualiza un método de pago de tienda desde el admin
 * (r14/r23 · sprint1_cierre). Cifra credentials en el repo.
 */
export interface ConfigureStorePaymentMethodInput {
  storeId: string;
  providerCode: string;
  displayName?: string;
  enabled?: boolean;
  webhookSecret?: string | null;
  captureMode?: 'manual' | 'automatic';
  credentials?: Record<string, unknown>;
}

export class ConfigureStorePaymentMethodUseCase
  implements UseCase<ConfigureStorePaymentMethodInput, Result<PublicStorePaymentMethod, never>>
{
  constructor(
    private readonly methods: StorePaymentMethodRepository,
    private readonly registry: PaymentProviderRegistry,
  ) {}

  async execute(input: ConfigureStorePaymentMethodInput): Promise<Result<PublicStorePaymentMethod, never>> {
    const provider = this.registry.get(input.providerCode);
    if (!provider) throw new Error(`Provider ${input.providerCode} no registrado`);
    const existing = await this.methods.findByProvider(input.storeId, input.providerCode);
    const next: StorePaymentMethod = {
      id: existing?.id ?? `${input.storeId}-${input.providerCode}`,
      storeId: input.storeId,
      providerCode: input.providerCode,
      displayName: input.displayName ?? existing?.displayName ?? provider.displayName,
      enabled: input.enabled ?? existing?.enabled ?? false,
      credentials: input.credentials ?? existing?.credentials ?? {},
      webhookSecret: input.webhookSecret === undefined ? (existing?.webhookSecret ?? null) : input.webhookSecret,
      captureMode: input.captureMode ?? existing?.captureMode ?? 'automatic',
    };
    await this.methods.save(next);
    return ok(toPublicPaymentMethod(next));
  }
}

export class ListPaymentMethodsUseCase implements UseCase<string, Result<PublicStorePaymentMethod[], never>> {
  constructor(
    private readonly methods: StorePaymentMethodRepository,
    private readonly registry: PaymentProviderRegistry,
  ) {}

  async execute(storeId: string): Promise<Result<PublicStorePaymentMethod[], never>> {
    // Selector de checkout: solo métodos habilitados Y bien configurados.
    // Los mal configurados se reportan vía ResolveAvailablePaymentMethodsUseCase
    // para alerta en admin (r14 · sprint1_cierre).
    const enabled = await this.methods.findEnabled(storeId);
    const configured = enabled.filter((method) => {
      const provider = this.registry.get(method.providerCode);
      if (!provider) return false;
      return provider.validateConfig(toDecryptedConfig(method)).state === 'configured';
    });
    return ok(configured.map(toPublicPaymentMethod));
  }
}

export interface AvailablePaymentMethod {
  method: PublicStorePaymentMethod;
  status: 'configured' | 'misconfigured';
  /** Razón del estado misconfigured (campos faltantes). Vacío si está OK. */
  misconfigurationReason?: string;
}

/**
 * Lista completa para el admin: incluye habilitados configurados Y mal
 * configurados (con razón) para mostrar alertas. Métodos no habilitados se
 * omiten. (r14 · sprint1_cierre)
 */
export class ResolveAvailablePaymentMethodsUseCase
  implements UseCase<string, Result<AvailablePaymentMethod[], never>>
{
  constructor(
    private readonly methods: StorePaymentMethodRepository,
    private readonly registry: PaymentProviderRegistry,
  ) {}

  async execute(storeId: string): Promise<Result<AvailablePaymentMethod[], never>> {
    const enabled = await this.methods.findEnabled(storeId);
    const items: AvailablePaymentMethod[] = enabled.map((method) => {
      const provider = this.registry.get(method.providerCode);
      if (!provider) {
        return { method: toPublicPaymentMethod(method), status: 'misconfigured', misconfigurationReason: `Provider ${method.providerCode} no registrado` };
      }
      const status = provider.validateConfig(toDecryptedConfig(method));
      return status.state === 'configured'
        ? { method: toPublicPaymentMethod(method), status: 'configured' }
        : { method: toPublicPaymentMethod(method), status: 'misconfigured', misconfigurationReason: status.reason };
    });
    return ok(items);
  }
}

export interface AuthorizePaymentInput {
  storeId: string;
  orderId: string;
  providerCode: string;
  amount: number;
  currency: string;
}

type PaymentUseCaseError =
  | PaymentNotFoundError
  | PaymentProviderNotFoundError
  | PaymentMethodUnavailableError
  | InvalidPaymentTransitionError
  | RefundAmountExceededError
  | PaymentNotRefundableError
  | OrderForPaymentNotFoundError
  | OrderNotPayableError
  | PaymentStoreMismatchError
  | PaymentCurrencyMismatchError
  | PaymentAmountExceedsOrderError
  | Error;

const NON_PAYABLE_STATUSES = new Set(['paid', 'refunded', 'partially_refunded', 'voided', 'cancelled']);

export class AuthorizePaymentUseCase implements UseCase<AuthorizePaymentInput, Result<PaymentOutput, PaymentUseCaseError>> {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly methods: StorePaymentMethodRepository,
    private readonly registry: PaymentProviderRegistry,
    private readonly orders: OrderForPaymentsPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: AuthorizePaymentInput): Promise<Result<PaymentOutput, PaymentUseCaseError>> {
    const order = await this.orders.findById(input.orderId);
    if (!order) return err(new OrderForPaymentNotFoundError(input.orderId));
    if (order.storeId !== input.storeId) return err(new PaymentStoreMismatchError());
    if (order.currencyCode !== input.currency) return err(new PaymentCurrencyMismatchError());
    if (NON_PAYABLE_STATUSES.has(order.paymentStatus)) return err(new OrderNotPayableError(order.paymentStatus));
    const remaining = order.total - order.paidAmount;
    if (input.amount <= 0 || input.amount > remaining + 0.001) return err(new PaymentAmountExceedsOrderError());

    const method = await this.methods.findEnabledByProvider(input.storeId, input.providerCode);
    if (!method) return err(new PaymentMethodUnavailableError(input.providerCode));
    const provider = this.registry.get(input.providerCode);
    if (!provider) return err(new PaymentProviderNotFoundError(input.providerCode));
    // Un método mal configurado no puede cobrar (r14 · sprint1_cierre).
    const configStatus = provider.validateConfig(toDecryptedConfig(method));
    if (configStatus.state !== 'configured') return err(new PaymentMethodUnavailableError(input.providerCode));
    const payment = Payment.create(input);
    const result = await provider.authorize({ ...input, paymentId: payment.id, config: toDecryptedConfig(method) });
    if (result.isErr()) return err(result.error);
    try {
      payment.setProviderReference(result.value.providerReference);
      payment.transition(result.value.status, 'Autorización de provider', result.value.occurredAt);
    } catch (error) {
      return err(error as InvalidPaymentTransitionError);
    }
    await this.payments.save(payment);
    await publishPaymentEvent(this.eventBus, payment);
    return ok(toPaymentOutput(payment));
  }
}

export class CapturePaymentUseCase implements UseCase<{ paymentId: string }, Result<PaymentOutput, PaymentUseCaseError>> {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly methods: StorePaymentMethodRepository,
    private readonly registry: PaymentProviderRegistry,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: { paymentId: string }): Promise<Result<PaymentOutput, PaymentUseCaseError>> {
    const payment = await this.payments.findById(input.paymentId);
    if (!payment) return err(new PaymentNotFoundError(input.paymentId));
    const method = await this.methods.findEnabledByProvider(payment.storeId, payment.providerCode);
    if (!method) return err(new PaymentMethodUnavailableError(payment.providerCode));
    const provider = this.registry.get(payment.providerCode);
    if (!provider) return err(new PaymentProviderNotFoundError(payment.providerCode));
    const result = await provider.capture({ paymentId: payment.id, orderId: payment.orderId, amount: payment.amount, currency: payment.currency, config: toDecryptedConfig(method) });
    if (result.isErr()) return err(result.error);
    try {
      payment.setProviderReference(result.value.providerReference);
      payment.transition(result.value.status, 'Captura de provider', result.value.occurredAt);
    } catch (error) {
      return err(error as InvalidPaymentTransitionError);
    }
    await this.payments.save(payment);
    await publishPaymentEvent(this.eventBus, payment);
    return ok(toPaymentOutput(payment));
  }
}

export class VoidPaymentUseCase implements UseCase<{ paymentId: string }, Result<PaymentOutput, PaymentUseCaseError>> {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly methods: StorePaymentMethodRepository,
    private readonly registry: PaymentProviderRegistry,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: { paymentId: string }): Promise<Result<PaymentOutput, PaymentUseCaseError>> {
    const payment = await this.payments.findById(input.paymentId);
    if (!payment) return err(new PaymentNotFoundError(input.paymentId));
    const method = await this.methods.findEnabledByProvider(payment.storeId, payment.providerCode);
    if (!method) return err(new PaymentMethodUnavailableError(payment.providerCode));
    const provider = this.registry.get(payment.providerCode);
    if (!provider) return err(new PaymentProviderNotFoundError(payment.providerCode));
    const result = await provider.void({ paymentId: payment.id, orderId: payment.orderId, amount: payment.amount, currency: payment.currency, config: toDecryptedConfig(method) });
    if (result.isErr()) return err(result.error);
    try {
      payment.transition('voided', 'Void de autorización', result.value.occurredAt);
    } catch (error) {
      return err(error as InvalidPaymentTransitionError);
    }
    await this.payments.save(payment);
    await publishPaymentEvent(this.eventBus, payment);
    return ok(toPaymentOutput(payment));
  }
}

export class MarkManualPaymentPaidUseCase implements UseCase<{ paymentId: string; actorId: string }, Result<PaymentOutput, PaymentUseCaseError>> {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: { paymentId: string; actorId: string }): Promise<Result<PaymentOutput, PaymentUseCaseError>> {
    const payment = await this.payments.findById(input.paymentId);
    if (!payment) return err(new PaymentNotFoundError(input.paymentId));
    try {
      payment.transition('paid', `Marcado manualmente por ${input.actorId}`);
    } catch (error) {
      return err(error as InvalidPaymentTransitionError);
    }
    await this.payments.save(payment);
    await this.eventBus.publish(paymentEvent('payment.manual_marked_paid', payment, { actorId: input.actorId }));
    await publishPaymentEvent(this.eventBus, payment);
    return ok(toPaymentOutput(payment));
  }
}

export class RefundPaymentUseCase implements UseCase<{ paymentId: string; amount: number }, Result<PaymentOutput, PaymentUseCaseError>> {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly methods: StorePaymentMethodRepository,
    private readonly registry: PaymentProviderRegistry,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: { paymentId: string; amount: number }): Promise<Result<PaymentOutput, PaymentUseCaseError>> {
    const payment = await this.payments.findById(input.paymentId);
    if (!payment) return err(new PaymentNotFoundError(input.paymentId));
    const method = await this.methods.findEnabledByProvider(payment.storeId, payment.providerCode);
    if (!method) return err(new PaymentMethodUnavailableError(payment.providerCode));
    const provider = this.registry.get(payment.providerCode);
    if (!provider) return err(new PaymentProviderNotFoundError(payment.providerCode));
    let refund;
    try {
      refund = payment.requestRefund(input.amount);
    } catch (error) {
      return err(error as RefundAmountExceededError | PaymentNotRefundableError);
    }
    const result = await provider.refund({ paymentId: payment.id, orderId: payment.orderId, amount: input.amount, currency: payment.currency, config: toDecryptedConfig(method), refundId: refund.id });
    if (result.isErr()) return err(result.error);
    payment.setRefundProviderReference(refund.id, result.value.providerReference);
    await this.payments.save(payment);
    await this.eventBus.publish(paymentEvent('payment.refund_requested', payment, { refundId: refund.id, amount: input.amount }));
    return ok(toPaymentOutput(payment));
  }
}

export interface HandlePaymentWebhookInput {
  /** Derivado del path del webhook (`/payments/webhooks/:storeId/:providerCode`). */
  storeId: string;
  providerCode: string;
  headers: Record<string, string | string[] | undefined>;
  rawBody: string;
}

export class HandlePaymentWebhookUseCase
  implements
    UseCase<
      HandlePaymentWebhookInput,
      Result<{ duplicate: boolean }, InvalidWebhookSignatureError | PaymentProviderNotFoundError | PaymentNotFoundError | DuplicateWebhookEventError | TransientPaymentProviderError | Error>
    >
{
  constructor(
    private readonly payments: PaymentRepository,
    private readonly webhooks: PaymentWebhookEventRepository,
    private readonly methods: StorePaymentMethodRepository,
    private readonly registry: PaymentProviderRegistry,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    input: HandlePaymentWebhookInput,
  ): Promise<Result<{ duplicate: boolean }, InvalidWebhookSignatureError | PaymentProviderNotFoundError | PaymentNotFoundError | DuplicateWebhookEventError | TransientPaymentProviderError | Error>> {
    const provider = this.registry.get(input.providerCode);
    if (!provider) return err(new PaymentProviderNotFoundError(input.providerCode));

    // El secret vive en StorePaymentMethod (per-tenant): la URL del
    // webhook es tenant-scoped, así que aquí ya sabemos la tienda y
    // podemos verificar la firma con el secreto correcto antes de
    // parsear (r14 · sprint1_cierre).
    const method = await this.methods.findByProvider(input.storeId, input.providerCode);
    if (!method || !method.webhookSecret) return err(new InvalidWebhookSignatureError());
    const config = { webhookSecret: method.webhookSecret, credentials: method.credentials, captureMode: method.captureMode };

    const parsed = await provider.handleWebhook({ providerCode: input.providerCode, headers: input.headers, rawBody: input.rawBody, config });
    if (parsed.isErr()) {
      if (!(parsed.error instanceof TransientPaymentProviderError)) return err(parsed.error);
      const eventId = eventIdFromRawBody(input.rawBody);
      if (!eventId) return err(parsed.error);
      const event = await this.claimOrLoadEvent(input.storeId, input.providerCode, eventId, input.rawBody);
      if (!event) return ok({ duplicate: true });
      event.attempts += 1;
      event.lastError = parsed.error.message;
      if (event.attempts > event.maxAttempts) {
        event.status = 'failed';
        await this.webhooks.save(event);
        return err(new Error('El webhook excedió el máximo de reintentos'));
      }
      await this.webhooks.save(event);
      return err(parsed.error);
    }

    const event = await this.claimOrLoadEvent(input.storeId, input.providerCode, parsed.value.eventId, input.rawBody);
    if (!event) return ok({ duplicate: true });
    event.attempts += 1;
    event.status = 'received';
    event.lastError = null;
    if (event.attempts > event.maxAttempts) {
      event.status = 'failed';
      event.lastError = 'El webhook excedió el máximo de reintentos';
      await this.webhooks.save(event);
      return err(new Error(event.lastError));
    }
    await this.webhooks.save(event);

    // Mapeo del pago local: el provider devuelve `paymentId` que puede
    // ser el id local (legacy/simulado) o un providerReference (MP real).
    // Tratamos los dos casos.
    const payment =
      (await this.payments.findById(parsed.value.paymentId)) ??
      (await this.payments.findByProviderReference(input.storeId, input.providerCode, parsed.value.providerReference ?? parsed.value.paymentId));
    if (!payment) return err(new PaymentNotFoundError(parsed.value.paymentId));
    if (payment.storeId !== input.storeId) {
      // Defensa: alguien envió un webhook a la URL de otra tienda.
      return err(new PaymentNotFoundError(parsed.value.paymentId));
    }
    try {
      payment.setProviderReference(parsed.value.providerReference);
      if (parsed.value.status === 'partially_refunded' || parsed.value.status === 'refunded') {
        payment.markRefundSucceeded({ refundReference: parsed.value.refundReference ?? parsed.value.providerReference ?? null, providerReference: parsed.value.providerReference ?? null, amount: parsed.value.amount ?? null, occurredAt: parsed.value.occurredAt });
      } else {
        payment.transition(parsed.value.status, `Webhook ${parsed.value.eventId}`, parsed.value.occurredAt);
      }
    } catch (error) {
      event.status = 'failed';
      event.lastError = (error as Error).message;
      await this.webhooks.save(event);
      return err(error as InvalidPaymentTransitionError);
    }
    await this.payments.save(payment);
    event.status = 'processed';
    event.processedAt = new Date();
    await this.webhooks.save(event);
    await publishPaymentEvent(this.eventBus, payment);
    return ok({ duplicate: false });
  }

  private async claimOrLoadEvent(storeId: string, providerCode: string, eventId: string, rawBody: string) {
    const event = PaymentWebhookEvent.create({ storeId, providerCode, eventId, rawBody });
    if (await this.webhooks.claim(event)) return event;
    const existing = await this.webhooks.findByStoreProviderAndEventId(storeId, providerCode, eventId);
    if (!existing || existing.status === 'processed' || existing.status === 'failed') return null;
    if (existing.lastError === null) return null;
    return existing;
  }
}

function eventIdFromRawBody(rawBody: string): string | null {
  try {
    const parsed = JSON.parse(rawBody) as { eventId?: unknown };
    return typeof parsed.eventId === 'string' ? parsed.eventId : null;
  } catch {
    return null;
  }
}

async function publishPaymentEvent(eventBus: EventBus, payment: Payment): Promise<void> {
  if (payment.status === 'authorized') await eventBus.publish(paymentEvent('payment.authorized', payment));
  if (payment.status === 'paid') await eventBus.publish(paymentEvent('payment.paid', payment));
  if (payment.status === 'partially_refunded') await eventBus.publish(paymentEvent('payment.partially_refunded', payment));
  if (payment.status === 'refunded') await eventBus.publish(paymentEvent('payment.refunded', payment));
  if (payment.status === 'voided') await eventBus.publish(paymentEvent('payment.voided', payment));
  if (payment.status === 'failed') await eventBus.publish(paymentEvent('payment.failed', payment));
}

function paymentEvent(name: string, payment: Payment, extra: Record<string, unknown> = {}): DomainEvent {
  return {
    name,
    occurredAt: new Date(),
    payload: {
      paymentId: payment.id,
      orderId: payment.orderId,
      storeId: payment.storeId,
      providerCode: payment.providerCode,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      ...extra,
    },
  };
}
