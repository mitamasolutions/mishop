import { err, ok, type EventBus, type Result, type UseCase } from '@mitama/core';
import type { OrderForPaymentsPort } from '@mitama/contracts';
import { Payment } from '../domain/payment.entity';
import type { PaymentProviderRegistry } from '../domain/payment-provider';
import type { PaymentWriter } from '../domain/payment.repository';
import type { StorePaymentMethodRepository } from '../domain/store-payment-method.repository';
import { toDecryptedConfig } from '../domain/store-payment-method.repository';
import {
  InvalidPaymentTransitionError,
  OrderForPaymentNotFoundError,
  OrderNotPayableError,
  PaymentAmountExceedsOrderError,
  PaymentCurrencyMismatchError,
  PaymentMethodUnavailableError,
  PaymentProviderNotFoundError,
  PaymentStoreMismatchError,
} from '../domain/errors';
import { toPaymentOutput, type PaymentOutput } from './payment.dto';
import { publishPaymentEvent } from './payment-events';
import type { PaymentUseCaseError } from './payment-use-case-error';

export interface AuthorizePaymentInput {
  storeId: string;
  orderId: string;
  providerCode: string;
  amount: number;
  currency: string;
}

const NON_PAYABLE_STATUSES = new Set(['paid', 'refunded', 'partially_refunded', 'voided', 'cancelled']);

export class AuthorizePaymentUseCase implements UseCase<AuthorizePaymentInput, Result<PaymentOutput, PaymentUseCaseError>> {
  constructor(
    private readonly payments: PaymentWriter,
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
