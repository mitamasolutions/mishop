/**
 * Composición del módulo de pagos (r14 · sprint1_cierre).
 *
 * - Registra el cipher opcional de settings (`SETTINGS_ENCRYPTION_KEY`).
 * - Registra los plugins activos del MVP: ManualPaymentProvider y
 *   MercadoPagoPaymentProvider (con HttpMercadoPagoClient real).
 * - Expone use cases que validan `configured ∩ enabled` y derivan
 *   storeId desde el path del webhook (NO desde el body).
 */
import { Module, type OnModuleInit } from '@nestjs/common';
import { EVENT_BUS, ORDER_FOR_PAYMENTS_PORT, type OrderForPaymentsPort } from '@mitama/contracts';
import type { EventBus } from '@mitama/core';
import { OrdersModule } from '@mitama/orders';
import { PAYMENTS_TOKENS } from './payments.tokens';
import {
  AuthorizePaymentUseCase,
  CapturePaymentUseCase,
  ConfigureStorePaymentMethodUseCase,
  HandlePaymentWebhookUseCase,
  ListPaymentMethodsUseCase,
  ListPaymentsByOrderUseCase,
  MarkManualPaymentPaidUseCase,
  RefundPaymentUseCase,
  ResolveAvailablePaymentMethodsUseCase,
  VoidPaymentUseCase,
} from './application/payment-use-cases';
import { PaymentProviderRegistry, type PaymentProvider } from './domain/payment-provider';
import type { PaymentRepository } from './domain/payment.repository';
import type { PaymentWebhookEventRepository } from './domain/payment-webhook-event.repository';
import type { StorePaymentMethodRepository } from './domain/store-payment-method.repository';
import { CredentialCipher, resolveCredentialCipher } from './infra/credential-cipher';
import { HttpMercadoPagoClient } from './infra/http-mercado-pago.client';
import { CashPaymentProvider, ManualPaymentProvider } from './infra/manual-payment.provider';
import { MercadoPagoPaymentProvider, type MercadoPagoClient } from './infra/mercado-pago-payment.provider';
import { PrismaPaymentRepository } from './infra/prisma-payment.repository';
import { PrismaPaymentWebhookEventRepository } from './infra/prisma-payment-webhook-event.repository';
import { PrismaStorePaymentMethodRepository } from './infra/prisma-store-payment-method.repository';
import { PaymentsController } from './http/payments.controller';

@Module({
  controllers: [PaymentsController],
  imports: [OrdersModule],
  providers: [
    { provide: PAYMENTS_TOKENS.paymentRepository, useClass: PrismaPaymentRepository },
    { provide: PAYMENTS_TOKENS.webhookRepository, useClass: PrismaPaymentWebhookEventRepository },
    { provide: PAYMENTS_TOKENS.storeMethodRepository, useClass: PrismaStorePaymentMethodRepository },
    {
      provide: PAYMENTS_TOKENS.credentialCipher,
      useFactory: (): CredentialCipher => resolveCredentialCipher(),
    },
    { provide: PAYMENTS_TOKENS.mercadoPagoClient, useClass: HttpMercadoPagoClient },
    {
      provide: PAYMENTS_TOKENS.providers,
      useFactory: (mp: MercadoPagoClient): PaymentProvider[] => [
        new ManualPaymentProvider(),
        new CashPaymentProvider(),
        new MercadoPagoPaymentProvider(mp),
      ],
      inject: [PAYMENTS_TOKENS.mercadoPagoClient],
    },
    {
      provide: PAYMENTS_TOKENS.providerRegistry,
      useFactory: (providers: PaymentProvider[]) => new PaymentProviderRegistry(providers),
      inject: [PAYMENTS_TOKENS.providers],
    },
    {
      provide: ListPaymentMethodsUseCase,
      useFactory: (methods: StorePaymentMethodRepository, registry: PaymentProviderRegistry) =>
        new ListPaymentMethodsUseCase(methods, registry),
      inject: [PAYMENTS_TOKENS.storeMethodRepository, PAYMENTS_TOKENS.providerRegistry],
    },
    {
      provide: ResolveAvailablePaymentMethodsUseCase,
      useFactory: (methods: StorePaymentMethodRepository, registry: PaymentProviderRegistry) =>
        new ResolveAvailablePaymentMethodsUseCase(methods, registry),
      inject: [PAYMENTS_TOKENS.storeMethodRepository, PAYMENTS_TOKENS.providerRegistry],
    },
    {
      provide: ListPaymentsByOrderUseCase,
      useFactory: (payments: PaymentRepository) => new ListPaymentsByOrderUseCase(payments),
      inject: [PAYMENTS_TOKENS.paymentRepository],
    },
    {
      provide: ConfigureStorePaymentMethodUseCase,
      useFactory: (methods: StorePaymentMethodRepository, registry: PaymentProviderRegistry) =>
        new ConfigureStorePaymentMethodUseCase(methods, registry),
      inject: [PAYMENTS_TOKENS.storeMethodRepository, PAYMENTS_TOKENS.providerRegistry],
    },
    {
      provide: AuthorizePaymentUseCase,
      useFactory: (
        payments: PaymentRepository,
        methods: StorePaymentMethodRepository,
        registry: PaymentProviderRegistry,
        orders: OrderForPaymentsPort,
        eventBus: EventBus,
      ) => new AuthorizePaymentUseCase(payments, methods, registry, orders, eventBus),
      inject: [PAYMENTS_TOKENS.paymentRepository, PAYMENTS_TOKENS.storeMethodRepository, PAYMENTS_TOKENS.providerRegistry, ORDER_FOR_PAYMENTS_PORT, EVENT_BUS],
    },
    {
      provide: CapturePaymentUseCase,
      useFactory: (payments: PaymentRepository, methods: StorePaymentMethodRepository, registry: PaymentProviderRegistry, eventBus: EventBus) =>
        new CapturePaymentUseCase(payments, methods, registry, eventBus),
      inject: [PAYMENTS_TOKENS.paymentRepository, PAYMENTS_TOKENS.storeMethodRepository, PAYMENTS_TOKENS.providerRegistry, EVENT_BUS],
    },
    {
      provide: VoidPaymentUseCase,
      useFactory: (payments: PaymentRepository, methods: StorePaymentMethodRepository, registry: PaymentProviderRegistry, eventBus: EventBus) =>
        new VoidPaymentUseCase(payments, methods, registry, eventBus),
      inject: [PAYMENTS_TOKENS.paymentRepository, PAYMENTS_TOKENS.storeMethodRepository, PAYMENTS_TOKENS.providerRegistry, EVENT_BUS],
    },
    {
      provide: MarkManualPaymentPaidUseCase,
      useFactory: (payments: PaymentRepository, eventBus: EventBus) => new MarkManualPaymentPaidUseCase(payments, eventBus),
      inject: [PAYMENTS_TOKENS.paymentRepository, EVENT_BUS],
    },
    {
      provide: RefundPaymentUseCase,
      useFactory: (payments: PaymentRepository, methods: StorePaymentMethodRepository, registry: PaymentProviderRegistry, eventBus: EventBus) =>
        new RefundPaymentUseCase(payments, methods, registry, eventBus),
      inject: [PAYMENTS_TOKENS.paymentRepository, PAYMENTS_TOKENS.storeMethodRepository, PAYMENTS_TOKENS.providerRegistry, EVENT_BUS],
    },
    {
      provide: HandlePaymentWebhookUseCase,
      useFactory: (
        payments: PaymentRepository,
        webhooks: PaymentWebhookEventRepository,
        methods: StorePaymentMethodRepository,
        registry: PaymentProviderRegistry,
        eventBus: EventBus,
      ) => new HandlePaymentWebhookUseCase(payments, webhooks, methods, registry, eventBus),
      inject: [PAYMENTS_TOKENS.paymentRepository, PAYMENTS_TOKENS.webhookRepository, PAYMENTS_TOKENS.storeMethodRepository, PAYMENTS_TOKENS.providerRegistry, EVENT_BUS],
    },
  ],
  exports: [PAYMENTS_TOKENS.providerRegistry, ResolveAvailablePaymentMethodsUseCase],
})
export class PaymentsModule implements OnModuleInit {
  onModuleInit(): void {}
}
