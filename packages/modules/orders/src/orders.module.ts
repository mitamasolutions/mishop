/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Module } from '@nestjs/common';
import { CHECKOUT_SHIPPING_RESOLVER_PORT, CHECKOUT_TAX_RESOLVER_PORT, EVENT_BUS, ORDER_FOR_PAYMENTS_PORT } from '@mitama/contracts';
import type { CheckoutShippingResolverPort, CheckoutTaxResolverPort } from '@mitama/contracts';
import type { EventBus } from '@mitama/core';
import { ORDERS_TOKENS } from './orders.tokens';
import type { CheckoutCartReader } from './domain/checkout-cart';
import type { EmailQueue } from './domain/email-queue';
import type { OrderRepository } from './domain/order.repository';
import type { StockReservationService } from './domain/stock-reservation';
import type { OutboxDispatcher } from './domain/outbox';
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
import type { EmailJobsRepository } from './domain/email-jobs.repository';
import type { EmailSender } from './domain/email-sender';

@Module({
  controllers: [OrdersController],
  providers: [
    { provide: ORDERS_TOKENS.orderRepository, useClass: PrismaOrderRepository },
    { provide: ORDERS_TOKENS.checkoutCartReader, useClass: PrismaCheckoutCartReader },
    { provide: ORDERS_TOKENS.stockReservationService, useClass: PrismaStockReservationService },
    { provide: ORDERS_TOKENS.emailQueue, useClass: PrismaEmailQueue },
    { provide: ORDERS_TOKENS.emailJobsRepository, useClass: PrismaEmailJobsRepository },
    { provide: ORDERS_TOKENS.emailSender, useClass: LogEmailSender },
    { provide: ORDERS_TOKENS.outboxDispatcher, useClass: PrismaOutboxDispatcher },
    { provide: ORDER_FOR_PAYMENTS_PORT, useClass: PrismaOrderForPayments },
    {
      provide: PaymentEventsHandler,
      useFactory: (eventBus: EventBus, orders: OrderRepository, email: EmailQueue, stock: StockReservationService) =>
        new PaymentEventsHandler(eventBus, orders, email, stock),
      inject: [EVENT_BUS, ORDERS_TOKENS.orderRepository, ORDERS_TOKENS.emailQueue, ORDERS_TOKENS.stockReservationService],
    },
    {
      provide: ShipmentEventsHandler,
      useFactory: (eventBus: EventBus, email: EmailQueue) => new ShipmentEventsHandler(eventBus, email),
      inject: [EVENT_BUS, ORDERS_TOKENS.emailQueue],
    },
    {
      provide: CreateOrderUseCase,
      useFactory: (
        orders: OrderRepository,
        carts: CheckoutCartReader,
        stock: StockReservationService,
        eventBus: EventBus,
        email: EmailQueue,
        taxResolver: CheckoutTaxResolverPort,
        shippingResolver: CheckoutShippingResolverPort,
      ) => new CreateOrderUseCase(orders, carts, stock, eventBus, email, taxResolver, shippingResolver),
      inject: [
        ORDERS_TOKENS.orderRepository,
        ORDERS_TOKENS.checkoutCartReader,
        ORDERS_TOKENS.stockReservationService,
        EVENT_BUS,
        ORDERS_TOKENS.emailQueue,
        CHECKOUT_TAX_RESOLVER_PORT,
        CHECKOUT_SHIPPING_RESOLVER_PORT,
      ],
    },
    {
      provide: ListOrdersUseCase,
      useFactory: (orders: OrderRepository) => new ListOrdersUseCase(orders),
      inject: [ORDERS_TOKENS.orderRepository],
    },
    {
      provide: ChangeOrderStateUseCase,
      useFactory: (orders: OrderRepository, eventBus: EventBus) => new ChangeOrderStateUseCase(orders, eventBus),
      inject: [ORDERS_TOKENS.orderRepository, EVENT_BUS],
    },
    {
      provide: ChangePaymentStateUseCase,
      useFactory: (orders: OrderRepository, eventBus: EventBus, email: EmailQueue) => new ChangePaymentStateUseCase(orders, eventBus, email),
      inject: [ORDERS_TOKENS.orderRepository, EVENT_BUS, ORDERS_TOKENS.emailQueue],
    },
    {
      provide: CancelOrderUseCase,
      useFactory: (orders: OrderRepository, stock: StockReservationService, eventBus: EventBus, email: EmailQueue) =>
        new CancelOrderUseCase(orders, stock, eventBus, email),
      inject: [ORDERS_TOKENS.orderRepository, ORDERS_TOKENS.stockReservationService, EVENT_BUS, ORDERS_TOKENS.emailQueue],
    },
    {
      provide: AddOrderNoteUseCase,
      useFactory: (orders: OrderRepository) => new AddOrderNoteUseCase(orders),
      inject: [ORDERS_TOKENS.orderRepository],
    },
    {
      provide: ResendOrderConfirmationUseCase,
      useFactory: (orders: OrderRepository, email: EmailQueue) => new ResendOrderConfirmationUseCase(orders, email),
      inject: [ORDERS_TOKENS.orderRepository, ORDERS_TOKENS.emailQueue],
    },
    {
      provide: ReleaseExpiredReservationsUseCase,
      useFactory: (stock: StockReservationService) => new ReleaseExpiredReservationsUseCase(stock),
      inject: [ORDERS_TOKENS.stockReservationService],
    },
    {
      provide: DispatchOutboxEventsUseCase,
      useFactory: (dispatcher: OutboxDispatcher) => new DispatchOutboxEventsUseCase(dispatcher),
      inject: [ORDERS_TOKENS.outboxDispatcher],
    },
    {
      provide: DrainEmailQueueUseCase,
      useFactory: (jobs: EmailJobsRepository, sender: EmailSender) => new DrainEmailQueueUseCase(jobs, sender),
      inject: [ORDERS_TOKENS.emailJobsRepository, ORDERS_TOKENS.emailSender],
    },
  ],
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
