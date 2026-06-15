/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Module } from '@nestjs/common';
import { EVENT_BUS, ORDER_FOR_PAYMENTS_PORT, type OrderForPaymentsPort } from '@mitama/contracts';
import type { EventBus } from '@mitama/core';
import { OrdersModule } from '@mitama/orders';
import { PAYMENTS_TOKENS } from './payments.tokens';
import {
  AuthorizePaymentUseCase,
  CapturePaymentUseCase,
  HandlePaymentWebhookUseCase,
  ListPaymentMethodsUseCase,
  MarkManualPaymentPaidUseCase,
  RefundPaymentUseCase,
  VoidPaymentUseCase,
} from './application/payment-use-cases';
import { PaymentProviderRegistry, type PaymentProvider } from './domain/payment-provider';
import type { PaymentProviderConfigResolver } from './domain/payment-provider-config-resolver';
import type { PaymentRepository } from './domain/payment.repository';
import type { PaymentWebhookEventRepository } from './domain/payment-webhook-event.repository';
import type { StorePaymentMethodRepository } from './domain/store-payment-method.repository';
import { EnvPaymentProviderConfigResolver } from './infra/env-payment-provider-config.resolver';
import { PrismaPaymentRepository } from './infra/prisma-payment.repository';
import { PrismaPaymentWebhookEventRepository } from './infra/prisma-payment-webhook-event.repository';
import { PrismaStorePaymentMethodRepository } from './infra/prisma-store-payment-method.repository';
import { CashPaymentProvider, ManualPaymentProvider, MercadoPagoPaymentProvider, StripePaymentProvider } from './infra/simulated-payment-providers';
import { PaymentsController } from './http/payments.controller';

@Module({
  controllers: [PaymentsController],
  imports: [OrdersModule],
  providers: [
    { provide: PAYMENTS_TOKENS.paymentRepository, useClass: PrismaPaymentRepository },
    { provide: PAYMENTS_TOKENS.webhookRepository, useClass: PrismaPaymentWebhookEventRepository },
    { provide: PAYMENTS_TOKENS.storeMethodRepository, useClass: PrismaStorePaymentMethodRepository },
    { provide: PAYMENTS_TOKENS.providerConfigResolver, useClass: EnvPaymentProviderConfigResolver },
    { provide: PAYMENTS_TOKENS.providers, useFactory: (): PaymentProvider[] => [new ManualPaymentProvider(), new CashPaymentProvider(), new StripePaymentProvider(), new MercadoPagoPaymentProvider()] },
    { provide: PAYMENTS_TOKENS.providerRegistry, useFactory: (providers: PaymentProvider[]) => new PaymentProviderRegistry(providers), inject: [PAYMENTS_TOKENS.providers] },
    { provide: ListPaymentMethodsUseCase, useFactory: (methods: StorePaymentMethodRepository) => new ListPaymentMethodsUseCase(methods), inject: [PAYMENTS_TOKENS.storeMethodRepository] },
    {
      provide: AuthorizePaymentUseCase,
      useFactory: (payments: PaymentRepository, methods: StorePaymentMethodRepository, registry: PaymentProviderRegistry, orders: OrderForPaymentsPort, eventBus: EventBus) =>
        new AuthorizePaymentUseCase(payments, methods, registry, orders, eventBus),
      inject: [PAYMENTS_TOKENS.paymentRepository, PAYMENTS_TOKENS.storeMethodRepository, PAYMENTS_TOKENS.providerRegistry, ORDER_FOR_PAYMENTS_PORT, EVENT_BUS],
    },
    {
      provide: CapturePaymentUseCase,
      useFactory: (payments: PaymentRepository, methods: StorePaymentMethodRepository, registry: PaymentProviderRegistry, eventBus: EventBus) => new CapturePaymentUseCase(payments, methods, registry, eventBus),
      inject: [PAYMENTS_TOKENS.paymentRepository, PAYMENTS_TOKENS.storeMethodRepository, PAYMENTS_TOKENS.providerRegistry, EVENT_BUS],
    },
    {
      provide: VoidPaymentUseCase,
      useFactory: (payments: PaymentRepository, methods: StorePaymentMethodRepository, registry: PaymentProviderRegistry, eventBus: EventBus) => new VoidPaymentUseCase(payments, methods, registry, eventBus),
      inject: [PAYMENTS_TOKENS.paymentRepository, PAYMENTS_TOKENS.storeMethodRepository, PAYMENTS_TOKENS.providerRegistry, EVENT_BUS],
    },
    {
      provide: MarkManualPaymentPaidUseCase,
      useFactory: (payments: PaymentRepository, eventBus: EventBus) => new MarkManualPaymentPaidUseCase(payments, eventBus),
      inject: [PAYMENTS_TOKENS.paymentRepository, EVENT_BUS],
    },
    {
      provide: RefundPaymentUseCase,
      useFactory: (payments: PaymentRepository, methods: StorePaymentMethodRepository, registry: PaymentProviderRegistry, eventBus: EventBus) => new RefundPaymentUseCase(payments, methods, registry, eventBus),
      inject: [PAYMENTS_TOKENS.paymentRepository, PAYMENTS_TOKENS.storeMethodRepository, PAYMENTS_TOKENS.providerRegistry, EVENT_BUS],
    },
    {
      provide: HandlePaymentWebhookUseCase,
      useFactory: (payments: PaymentRepository, webhooks: PaymentWebhookEventRepository, registry: PaymentProviderRegistry, configResolver: PaymentProviderConfigResolver, eventBus: EventBus) => new HandlePaymentWebhookUseCase(payments, webhooks, registry, configResolver, eventBus),
      inject: [PAYMENTS_TOKENS.paymentRepository, PAYMENTS_TOKENS.webhookRepository, PAYMENTS_TOKENS.providerRegistry, PAYMENTS_TOKENS.providerConfigResolver, EVENT_BUS],
    },
  ],
  exports: [PAYMENTS_TOKENS.providerRegistry],
})
export class PaymentsModule {}
