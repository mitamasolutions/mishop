import { createHash } from 'node:crypto';
import { err, ok, Result, UseCase, type EventBus } from '@mitama/core';
import type { OrderEventPayload, SalesDomainEvent } from '@mitama/contracts';
import { Order, type OrderPaymentStatus, type OrderStatus } from '../domain/order.entity';
import type { CheckoutCartReader } from '../domain/checkout-cart';
import type { EmailQueue } from '../domain/email-queue';
import type { OrderFilter, OrderRepository } from '../domain/order.repository';
import type { StockReservationService } from '../domain/stock-reservation';
import {
  CheckoutCartNotReadyError,
  CompletedOrderCannotBeCancelledError,
  IdempotencyConflictError,
  InsufficientStockError,
  InvalidOrderStateTransitionError,
  InvalidPaymentStateTransitionError,
  OrderNotFoundError,
} from '../domain/errors';
import { toOrderOutput, type OrderOutput } from './order.dto';

const RESERVATION_TTL_MS = 15 * 60 * 1000;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export interface CreateOrderInput {
  cartId: string;
  idempotencyKey: string;
  actorId?: string | null;
}

export type CreateOrderError = CheckoutCartNotReadyError | IdempotencyConflictError | InsufficientStockError | OrderNotFoundError;

export class CreateOrderUseCase implements UseCase<CreateOrderInput, Result<OrderOutput, CreateOrderError>> {
  constructor(
    private readonly orders: OrderRepository,
    private readonly carts: CheckoutCartReader,
    private readonly stockReservations: StockReservationService,
    private readonly eventBus: EventBus,
    private readonly emailQueue: EmailQueue,
  ) {}

  async execute(input: CreateOrderInput): Promise<Result<OrderOutput, CreateOrderError>> {
    const requestHash = hashPayload({ cartId: input.cartId });
    const cart = await this.carts.getReadyCart(input.cartId);
    if (!cart || cart.lines.length === 0) return err(new CheckoutCartNotReadyError());

    const existingKey = await this.orders.findIdempotency(cart.storeId, input.idempotencyKey);
    if (existingKey) {
      if (existingKey.requestHash !== requestHash) return err(new IdempotencyConflictError());
      const existingOrder = await this.orders.findById(existingKey.orderId);
      return existingOrder ? ok(toOrderOutput(existingOrder)) : err(new OrderNotFoundError(existingKey.orderId));
    }

    const orderNumber = await this.orders.nextOrderNumber(cart.storeId, cart.channel === 'web' ? 'WEB-' : 'POS-');
    const reservationExpiresAt = new Date(Date.now() + RESERVATION_TTL_MS);
    const order = Order.fromCart(cart, orderNumber, reservationExpiresAt);
    const reserved = await this.stockReservations.reserve({ orderId: order.id, expiresAt: reservationExpiresAt, lines: cart.lines });
    if (!reserved) return err(new InsufficientStockError());

    await this.orders.save(order, { key: input.idempotencyKey, requestHash, expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS) });
    await this.carts.markOrdered(cart.id);
    await this.eventBus.publish(orderEvent('order.created', eventPayload(order)));
    await this.emailQueue.enqueue({ orderId: order.id, templateCode: 'order.created', payload: { orderNumber: order.orderNumber } });
    return ok(toOrderOutput(order));
  }
}

export class ListOrdersUseCase implements UseCase<OrderFilter, Result<OrderOutput[], never>> {
  constructor(private readonly orders: OrderRepository) {}

  async execute(filter: OrderFilter): Promise<Result<OrderOutput[], never>> {
    return ok((await this.orders.findAll(filter)).map(toOrderOutput));
  }
}

export class ChangeOrderStateUseCase
  implements UseCase<{ orderId: string; to: OrderStatus; actorId?: string | null; reason?: string | null }, Result<OrderOutput, OrderNotFoundError | InvalidOrderStateTransitionError>>
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: { orderId: string; to: OrderStatus; actorId?: string | null; reason?: string | null }): Promise<Result<OrderOutput, OrderNotFoundError | InvalidOrderStateTransitionError>> {
    const order = await this.orders.findById(input.orderId);
    if (!order) return err(new OrderNotFoundError(input.orderId));
    try {
      order.transitionOrder(input.to, input.actorId ?? null, input.reason ?? null);
    } catch (error) {
      return err(error as InvalidOrderStateTransitionError);
    }
    await this.orders.save(order);
    if (input.to === 'completed') await this.eventBus.publish(orderEvent('order.completed', eventPayload(order)));
    return ok(toOrderOutput(order));
  }
}

export class ChangePaymentStateUseCase
  implements UseCase<{ orderId: string; to: OrderPaymentStatus; actorId?: string | null; reason?: string | null }, Result<OrderOutput, OrderNotFoundError | InvalidPaymentStateTransitionError>>
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly eventBus: EventBus,
    private readonly emailQueue: EmailQueue,
  ) {}

  async execute(input: { orderId: string; to: OrderPaymentStatus; actorId?: string | null; reason?: string | null }): Promise<Result<OrderOutput, OrderNotFoundError | InvalidPaymentStateTransitionError>> {
    const order = await this.orders.findById(input.orderId);
    if (!order) return err(new OrderNotFoundError(input.orderId));
    try {
      order.transitionPayment(input.to, input.actorId ?? null, input.reason ?? null);
    } catch (error) {
      return err(error as InvalidPaymentStateTransitionError);
    }
    await this.orders.save(order);
    if (input.to === 'authorized') await this.eventBus.publish(orderEvent('payment.authorized', eventPayload(order)));
    if (input.to === 'paid') {
      await this.eventBus.publish(orderEvent('payment.paid', eventPayload(order)));
      await this.emailQueue.enqueue({ orderId: order.id, templateCode: 'payment.paid', payload: { orderNumber: order.orderNumber } });
    }
    if (input.to === 'refunded') await this.eventBus.publish(orderEvent('order.refunded', eventPayload(order)));
    return ok(toOrderOutput(order));
  }
}

export class CancelOrderUseCase implements UseCase<{ orderId: string; actorId?: string | null; reason?: string | null }, Result<OrderOutput, OrderNotFoundError | CompletedOrderCannotBeCancelledError>> {
  constructor(
    private readonly orders: OrderRepository,
    private readonly stockReservations: StockReservationService,
    private readonly eventBus: EventBus,
    private readonly emailQueue: EmailQueue,
  ) {}

  async execute(input: { orderId: string; actorId?: string | null; reason?: string | null }): Promise<Result<OrderOutput, OrderNotFoundError | CompletedOrderCannotBeCancelledError>> {
    const order = await this.orders.findById(input.orderId);
    if (!order) return err(new OrderNotFoundError(input.orderId));
    try {
      order.cancel(input.actorId ?? null, input.reason ?? null);
    } catch (error) {
      return err(error as CompletedOrderCannotBeCancelledError);
    }
    await this.stockReservations.release(order.id);
    await this.orders.save(order);
    await this.eventBus.publish(orderEvent('order.cancelled', eventPayload(order)));
    await this.emailQueue.enqueue({ orderId: order.id, templateCode: 'order.cancelled', payload: { orderNumber: order.orderNumber } });
    return ok(toOrderOutput(order));
  }
}

export class AddOrderNoteUseCase implements UseCase<{ orderId: string; authorId: string; body: string }, Result<OrderOutput, OrderNotFoundError>> {
  constructor(private readonly orders: OrderRepository) {}

  async execute(input: { orderId: string; authorId: string; body: string }): Promise<Result<OrderOutput, OrderNotFoundError>> {
    const order = await this.orders.findById(input.orderId);
    if (!order) return err(new OrderNotFoundError(input.orderId));
    order.addNote(input.authorId, input.body);
    await this.orders.save(order);
    return ok(toOrderOutput(order));
  }
}

export class ResendOrderConfirmationUseCase implements UseCase<string, Result<void, OrderNotFoundError>> {
  constructor(
    private readonly orders: OrderRepository,
    private readonly emailQueue: EmailQueue,
  ) {}

  async execute(orderId: string): Promise<Result<void, OrderNotFoundError>> {
    const order = await this.orders.findById(orderId);
    if (!order) return err(new OrderNotFoundError(orderId));
    await this.emailQueue.enqueue({ orderId, templateCode: 'order.created', payload: { orderNumber: order.orderNumber } });
    return ok(undefined);
  }
}

function hashPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function eventPayload(order: Order): OrderEventPayload {
  return { orderId: order.id, orderNumber: order.orderNumber, storeId: order.storeId, customerId: order.customerId };
}

function orderEvent(name: SalesDomainEvent['name'], payload: OrderEventPayload): SalesDomainEvent {
  return { name, payload, occurredAt: new Date() } as SalesDomainEvent;
}
