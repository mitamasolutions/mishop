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
import { createModuleProviders, EVENT_BUS, ORDER_FOR_PAYMENTS_PORT } from '@mitama/contracts';
import { OrdersModule } from '../orders';
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
import { PaymentProviderRegistry } from './domain/payment-provider';
import type { PaymentProvider } from '@mitama/contracts';
import { CredentialCipher, resolveCredentialCipher } from './infra/credential-cipher';
import { HttpMercadoPagoClient, MercadoPagoPaymentProvider, type MercadoPagoClient } from '@mitama/payment_mercado_pago';
import { CashPaymentProvider, ManualPaymentProvider } from '@mitama/payment_manual';
import { PrismaPaymentRepository } from './infra/prisma-payment.repository';
import { PrismaPaymentWebhookEventRepository } from './infra/prisma-payment-webhook-event.repository';
import { PrismaStorePaymentMethodRepository } from './infra/prisma-store-payment-method.repository';
import { PaymentsController } from './http/payments.controller';

@Module({
  controllers: [PaymentsController],
  imports: [OrdersModule],
  providers: createModuleProviders([
    { provide: PAYMENTS_TOKENS.paymentRepository, useClass: PrismaPaymentRepository },
    { provide: PAYMENTS_TOKENS.webhookRepository, useClass: PrismaPaymentWebhookEventRepository },
    { provide: PAYMENTS_TOKENS.storeMethodRepository, useClass: PrismaStorePaymentMethodRepository },
    { provide: PAYMENTS_TOKENS.credentialCipher, factory: (): CredentialCipher => resolveCredentialCipher() },
    { provide: PAYMENTS_TOKENS.mercadoPagoClient, useClass: HttpMercadoPagoClient },
    {
      provide: PAYMENTS_TOKENS.providers,
      factory: (mp: MercadoPagoClient): PaymentProvider[] => [
        new ManualPaymentProvider(),
        new CashPaymentProvider(),
        new MercadoPagoPaymentProvider(mp),
      ],
      inject: [PAYMENTS_TOKENS.mercadoPagoClient],
    },
    {
      provide: PAYMENTS_TOKENS.providerRegistry,
      factory: (providers: PaymentProvider[]) => new PaymentProviderRegistry(providers),
      inject: [PAYMENTS_TOKENS.providers],
    },
    { useCase: ListPaymentMethodsUseCase, inject: [PAYMENTS_TOKENS.storeMethodRepository, PAYMENTS_TOKENS.providerRegistry] },
    { useCase: ResolveAvailablePaymentMethodsUseCase, inject: [PAYMENTS_TOKENS.storeMethodRepository, PAYMENTS_TOKENS.providerRegistry] },
    { useCase: ListPaymentsByOrderUseCase, inject: [PAYMENTS_TOKENS.paymentRepository] },
    { useCase: ConfigureStorePaymentMethodUseCase, inject: [PAYMENTS_TOKENS.storeMethodRepository, PAYMENTS_TOKENS.providerRegistry] },
    {
      useCase: AuthorizePaymentUseCase,
      inject: [PAYMENTS_TOKENS.paymentRepository, PAYMENTS_TOKENS.storeMethodRepository, PAYMENTS_TOKENS.providerRegistry, ORDER_FOR_PAYMENTS_PORT, EVENT_BUS],
    },
    {
      useCase: CapturePaymentUseCase,
      inject: [PAYMENTS_TOKENS.paymentRepository, PAYMENTS_TOKENS.paymentRepository, PAYMENTS_TOKENS.storeMethodRepository, PAYMENTS_TOKENS.providerRegistry, EVENT_BUS],
    },
    {
      useCase: VoidPaymentUseCase,
      inject: [PAYMENTS_TOKENS.paymentRepository, PAYMENTS_TOKENS.paymentRepository, PAYMENTS_TOKENS.storeMethodRepository, PAYMENTS_TOKENS.providerRegistry, EVENT_BUS],
    },
    { useCase: MarkManualPaymentPaidUseCase, inject: [PAYMENTS_TOKENS.paymentRepository, PAYMENTS_TOKENS.paymentRepository, EVENT_BUS] },
    {
      useCase: RefundPaymentUseCase,
      inject: [PAYMENTS_TOKENS.paymentRepository, PAYMENTS_TOKENS.paymentRepository, PAYMENTS_TOKENS.storeMethodRepository, PAYMENTS_TOKENS.providerRegistry, EVENT_BUS],
    },
    {
      useCase: HandlePaymentWebhookUseCase,
      inject: [
        PAYMENTS_TOKENS.paymentRepository,
        PAYMENTS_TOKENS.paymentRepository,
        PAYMENTS_TOKENS.paymentRepository,
        PAYMENTS_TOKENS.webhookRepository,
        PAYMENTS_TOKENS.storeMethodRepository,
        PAYMENTS_TOKENS.providerRegistry,
        EVENT_BUS,
      ],
    },
  ]),
  exports: [PAYMENTS_TOKENS.providerRegistry, ResolveAvailablePaymentMethodsUseCase],
})
export class PaymentsModule implements OnModuleInit {
  onModuleInit(): void {}
}
