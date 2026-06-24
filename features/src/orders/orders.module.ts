/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Module } from '@nestjs/common';
import { CHECKOUT_SHIPPING_RESOLVER_PORT, CHECKOUT_TAX_RESOLVER_PORT, createModuleProviders, EVENT_BUS, ORDER_FOR_PAYMENTS_PORT } from '@mitama/contracts';
import { ORDERS_TOKENS } from './orders.tokens';
import {
  AddOrderNoteUseCase,
  CancelOrderUseCase,
  ChangeOrderStateUseCase,
  ChangePaymentStateUseCase,
  CreateOrderUseCase,
  DispatchOutboxEventsUseCase,
  ListOrdersUseCase,
  ReleaseExpiredReservationsUseCase,
  ResendOrderConfirmationUseCase,
} from './application/order-use-cases';
import { PrismaCheckoutCartReader } from './infra/prisma-checkout-cart.reader';
import { PrismaEmailQueue } from './infra/prisma-email-queue';
import { PrismaEmailJobsRepository } from './infra/prisma-email-jobs.repository';
import { LogEmailSender } from './infra/log-email-sender';
import { PrismaOrderRepository } from './infra/prisma-order.repository';
import { PrismaOrderForPayments } from './infra/prisma-order-for-payments';
import { PrismaOutboxDispatcher } from './infra/prisma-outbox-dispatcher';
import { PrismaStockReservationService } from './infra/prisma-stock-reservation.service';
import { PaymentEventsHandler } from './infra/payment-events.handler';
import { ShipmentEventsHandler } from './infra/shipment-events.handler';
import { OrdersController } from './http/orders.controller';
import { DrainEmailQueueUseCase } from './application/drain-email-queue.use-case';

@Module({
  controllers: [OrdersController],
  providers: createModuleProviders([
    { provide: ORDERS_TOKENS.orderRepository, useClass: PrismaOrderRepository },
    { provide: ORDERS_TOKENS.checkoutCartReader, useClass: PrismaCheckoutCartReader },
    { provide: ORDERS_TOKENS.stockReservationService, useClass: PrismaStockReservationService },
    { provide: ORDERS_TOKENS.emailQueue, useClass: PrismaEmailQueue },
    { provide: ORDERS_TOKENS.emailJobsRepository, useClass: PrismaEmailJobsRepository },
    { provide: ORDERS_TOKENS.emailSender, useClass: LogEmailSender },
    { provide: ORDERS_TOKENS.outboxDispatcher, useClass: PrismaOutboxDispatcher },
    { provide: ORDER_FOR_PAYMENTS_PORT, useClass: PrismaOrderForPayments },
    { provider: PaymentEventsHandler, inject: [EVENT_BUS, ORDERS_TOKENS.orderRepository, ORDERS_TOKENS.orderRepository, ORDERS_TOKENS.emailQueue, ORDERS_TOKENS.stockReservationService] },
    { provider: ShipmentEventsHandler, inject: [EVENT_BUS, ORDERS_TOKENS.emailQueue] },
    {
      useCase: CreateOrderUseCase,
      inject: [
        ORDERS_TOKENS.orderRepository,
        ORDERS_TOKENS.orderRepository,
        ORDERS_TOKENS.orderRepository,
        ORDERS_TOKENS.orderRepository,
        ORDERS_TOKENS.checkoutCartReader,
        ORDERS_TOKENS.stockReservationService,
        EVENT_BUS,
        ORDERS_TOKENS.emailQueue,
        CHECKOUT_TAX_RESOLVER_PORT,
        CHECKOUT_SHIPPING_RESOLVER_PORT,
      ],
    },
    { useCase: ListOrdersUseCase, inject: [ORDERS_TOKENS.orderRepository] },
    { useCase: ChangeOrderStateUseCase, inject: [ORDERS_TOKENS.orderRepository, ORDERS_TOKENS.orderRepository, EVENT_BUS] },
    { useCase: ChangePaymentStateUseCase, inject: [ORDERS_TOKENS.orderRepository, ORDERS_TOKENS.orderRepository, EVENT_BUS, ORDERS_TOKENS.emailQueue] },
    { useCase: CancelOrderUseCase, inject: [ORDERS_TOKENS.orderRepository, ORDERS_TOKENS.orderRepository, ORDERS_TOKENS.stockReservationService, EVENT_BUS, ORDERS_TOKENS.emailQueue] },
    { useCase: AddOrderNoteUseCase, inject: [ORDERS_TOKENS.orderRepository, ORDERS_TOKENS.orderRepository] },
    { useCase: ResendOrderConfirmationUseCase, inject: [ORDERS_TOKENS.orderRepository, ORDERS_TOKENS.emailQueue] },
    { useCase: ReleaseExpiredReservationsUseCase, inject: [ORDERS_TOKENS.stockReservationService] },
    { useCase: DispatchOutboxEventsUseCase, inject: [ORDERS_TOKENS.outboxDispatcher] },
    { useCase: DrainEmailQueueUseCase, inject: [ORDERS_TOKENS.emailJobsRepository, ORDERS_TOKENS.emailSender] },
  ]),
  exports: [
    ORDERS_TOKENS.orderRepository,
    ORDERS_TOKENS.stockReservationService,
    ORDER_FOR_PAYMENTS_PORT,
    DispatchOutboxEventsUseCase,
    DrainEmailQueueUseCase,
    ReleaseExpiredReservationsUseCase,
  ],
})
export class OrdersModule {}
