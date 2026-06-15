import { createHash } from 'node:crypto';
import { err, ok, Result, UseCase, roundMoney, type EventBus } from '@mitama/core';
import type {
  CheckoutShippingAddress,
  CheckoutShippingResolverPort,
  CheckoutTaxResolverPort,
  OrderEventPayload,
  SalesDomainEvent,
} from '@mitama/contracts';
import { Order, type OrderPaymentStatus, type OrderStatus, type OrderTotalsBreakdown } from '../domain/order.entity';
import type { CheckoutCartReader, CheckoutCartSnapshot } from '../domain/checkout-cart';
import type { EmailQueue } from '../domain/email-queue';
import type { OrderFilter, OrderRepository } from '../domain/order.repository';
import type { OutboxDispatcher } from '../domain/outbox';
import type { StockReservationService } from '../domain/stock-reservation';
import {
  CheckoutCartNotReadyError,
  CompletedOrderCannotBeCancelledError,
  IdempotencyConflictError,
  InsufficientStockError,
  InvalidOrderStateTransitionError,
  InvalidPaymentStateTransitionError,
  OrderAlreadyExistsForCartError,
  OrderNotFoundError,
  ShippingMethodNotEligibleError,
} from '../domain/errors';
import { toOrderOutput, type OrderOutput } from './order.dto';

const RESERVATION_TTL_MS = 15 * 60 * 1000;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export interface CreateOrderInput {
  cartId: string;
  idempotencyKey: string;
  actorId?: string | null;
}

export type CreateOrderError =
  | CheckoutCartNotReadyError
  | IdempotencyConflictError
  | InsufficientStockError
  | OrderAlreadyExistsForCartError
  | OrderNotFoundError
  | ShippingMethodNotEligibleError;

export class CreateOrderUseCase implements UseCase<CreateOrderInput, Result<OrderOutput, CreateOrderError>> {
  constructor(
    private readonly orders: OrderRepository,
    private readonly carts: CheckoutCartReader,
    private readonly stockReservations: StockReservationService,
    private readonly eventBus: EventBus,
    private readonly emailQueue: EmailQueue,
    private readonly taxResolver: CheckoutTaxResolverPort,
    private readonly shippingResolver: CheckoutShippingResolverPort,
  ) {}

  async execute(input: CreateOrderInput): Promise<Result<OrderOutput, CreateOrderError>> {
    const requestHash = hashPayload({ cartId: input.cartId });

    // Idempotencia PRIMERO: un replay (mismo key) debe devolver la orden
    // original sin depender del estado del carrito. Tras crear la orden el
    // carrito queda "ordenado" y deja de estar listo, así que validar el
    // carrito antes que la idempotencia rompía el reintento (devolvía 400).
    const storeId = await this.carts.getCartStoreId(input.cartId);
    if (storeId) {
      const existingKey = await this.orders.findIdempotency(storeId, input.idempotencyKey);
      if (existingKey) {
        if (existingKey.requestHash !== requestHash) return err(new IdempotencyConflictError());
        const existingOrder = await this.orders.findById(existingKey.orderId);
        return existingOrder ? ok(toOrderOutput(existingOrder)) : err(new OrderNotFoundError(existingKey.orderId));
      }
    }

    const cart = await this.carts.getReadyCart(input.cartId);
    if (!cart || cart.lines.length === 0) return err(new CheckoutCartNotReadyError());

    // Recálculo server-side de totales: el cliente NO controla ni el costo
    // de envío ni el impuesto (r13 · sprint1_cierre).
    const totalsResult = await this.resolveTotals(cart);
    if (totalsResult.isErr()) return err(totalsResult.error);
    const totals = totalsResult.value;

    const orderNumber = await this.orders.nextOrderNumber(cart.storeId, cart.channel === 'web' ? 'WEB-' : 'POS-');
    const reservationExpiresAt = new Date(Date.now() + RESERVATION_TTL_MS);
    const order = Order.fromCart(cart, orderNumber, reservationExpiresAt, totals);
    try {
      await this.orders.save(order);
    } catch (error) {
      if (error instanceof OrderAlreadyExistsForCartError) return err(error);
      throw error;
    }

    const reserved = await this.stockReservations.reserve({ orderId: order.id, expiresAt: reservationExpiresAt, lines: cart.lines });
    if (!reserved) {
      await this.orders.delete(order.id);
      return err(new InsufficientStockError());
    }

    try {
      await this.orders.save(order, {
        idempotency: { key: input.idempotencyKey, requestHash, expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS) },
        outbox: [{ name: 'order.created', payload: eventPayload(order) as unknown as Record<string, unknown> }],
      });
    } catch (error) {
      await this.stockReservations.release(order.id);
      await this.orders.delete(order.id);
      if (error instanceof IdempotencyConflictError || error instanceof OrderAlreadyExistsForCartError) return err(error);
      throw error;
    }
    await this.carts.markOrdered(cart.id);
    await this.emailQueue.enqueue({ orderId: order.id, templateCode: 'order.created', payload: { orderNumber: order.orderNumber } });
    return ok(toOrderOutput(order));
  }

  /**
   * Resuelve, server-side, el costo de envío (validando elegibilidad por
   * zona) y el impuesto por línea + total. El envío NO se grava en el MVP:
   * `total = subtotal + shippingTotal + taxTotal`.
   */
  private async resolveTotals(
    cart: CheckoutCartSnapshot,
  ): Promise<Result<OrderTotalsBreakdown, ShippingMethodNotEligibleError>> {
    const subtotalCart = roundMoney(cart.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
    const weightKg = cart.lines.reduce((sum, line) => sum + line.quantity * (line.weightKg ?? 0), 0);
    const address = cart.shippingAddress as unknown as CheckoutShippingAddress;

    const shipping = await this.shippingResolver.resolve({
      storeId: cart.storeId,
      methodId: cart.shippingMethod.id,
      address,
      subtotal: subtotalCart,
      weightKg,
    });
    if (!shipping.ok) return err(new ShippingMethodNotEligibleError(shipping.error.message));

    const tax = await this.taxResolver.calculate({
      storeId: cart.storeId,
      regionId: cart.regionId,
      pricesIncludeTax: cart.pricesIncludeTax,
      lines: cart.lines.map((line) => ({
        lineId: line.cartLineId,
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxCategory: line.taxCategory,
      })),
    });

    const taxByCartLineId: Record<string, number> = {};
    for (const line of tax.lines) taxByCartLineId[line.lineId] = line.taxAmount;

    const subtotal = roundMoney(tax.subtotal);
    const taxTotal = roundMoney(tax.taxTotal);
    const shippingTotal = roundMoney(shipping.value.amount);
    const total = roundMoney(subtotal + shippingTotal + taxTotal);

    return ok({
      subtotal,
      shippingTotal,
      taxTotal,
      total,
      taxByCartLineId,
      shippingMethod: {
        id: shipping.value.methodId,
        providerCode: shipping.value.providerCode,
        name: shipping.value.name,
        amount: shippingTotal,
      },
    });
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

/**
 * Libera reservas con `expiresAt <= now`. Pensada para ejecutarse como
 * job periódico (cron/worker). Devuelve los ids de orden liberados.
 */
export class ReleaseExpiredReservationsUseCase implements UseCase<Date | undefined, Result<string[], never>> {
  constructor(private readonly stockReservations: StockReservationService) {}

  async execute(now = new Date()): Promise<Result<string[], never>> {
    return ok(await this.stockReservations.releaseExpired(now));
  }
}

/**
 * Despacha eventos pendientes del outbox al `EventBus`. Pensada para
 * ejecutarse como job periódico (cron/worker).
 */
export class DispatchOutboxEventsUseCase implements UseCase<number | undefined, Result<{ dispatched: string[]; failed: string[] }, never>> {
  constructor(private readonly dispatcher: OutboxDispatcher) {}

  async execute(limit?: number): Promise<Result<{ dispatched: string[]; failed: string[] }, never>> {
    return ok(await this.dispatcher.dispatchPending(limit));
  }
}

function hashPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function eventPayload(order: Order): OrderEventPayload {
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    storeId: order.storeId,
    customerId: order.customerId,
    productIds: [...new Set(order.lines.map((line) => line.productId))],
  };
}

function orderEvent(name: SalesDomainEvent['name'], payload: OrderEventPayload): SalesDomainEvent {
  return { name, payload, occurredAt: new Date() } as SalesDomainEvent;
}
