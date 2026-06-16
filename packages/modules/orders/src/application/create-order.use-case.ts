import { createHash } from 'node:crypto';
import { err, ok, roundMoney, type EventBus, type Result, type UseCase } from '@mitama/core';
import type { CheckoutShippingAddress, CheckoutShippingResolverPort, CheckoutTaxResolverPort } from '@mitama/contracts';
import { Order, type OrderTotalsBreakdown } from '../domain/order.entity';
import type { CheckoutCartReader, CheckoutCartSnapshot } from '../domain/checkout-cart';
import type { EmailQueue } from '../domain/email-queue';
import type { OrderIdempotencyReader, OrderNumberGenerator, OrderReader, OrderWriter } from '../domain/order.repository';
import type { StockReservationService } from '../domain/stock-reservation';
import {
  CheckoutCartNotReadyError,
  IdempotencyConflictError,
  InsufficientStockError,
  OrderAlreadyExistsForCartError,
  OrderNotFoundError,
  ShippingMethodNotEligibleError,
} from '../domain/errors';
import { toOrderOutput, type OrderOutput } from './order.dto';
import { eventPayload } from './order-events';

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
    private readonly orderReader: OrderReader,
    private readonly orderWriter: OrderWriter,
    private readonly idempotencyReader: OrderIdempotencyReader,
    private readonly orderNumberGenerator: OrderNumberGenerator,
    private readonly carts: CheckoutCartReader,
    private readonly stockReservations: StockReservationService,
    private readonly eventBus: EventBus,
    private readonly emailQueue: EmailQueue,
    private readonly taxResolver: CheckoutTaxResolverPort,
    private readonly shippingResolver: CheckoutShippingResolverPort,
  ) {}

  async execute(input: CreateOrderInput): Promise<Result<OrderOutput, CreateOrderError>> {
    const requestHash = hashPayload({ cartId: input.cartId });

    const storeId = await this.carts.getCartStoreId(input.cartId);
    if (storeId) {
      const existingKey = await this.idempotencyReader.findIdempotency(storeId, input.idempotencyKey);
      if (existingKey) {
        if (existingKey.requestHash !== requestHash) return err(new IdempotencyConflictError());
        const existingOrder = await this.orderReader.findById(existingKey.orderId);
        return existingOrder ? ok(toOrderOutput(existingOrder)) : err(new OrderNotFoundError(existingKey.orderId));
      }
    }

    const cart = await this.carts.getReadyCart(input.cartId);
    if (!cart || cart.lines.length === 0) return err(new CheckoutCartNotReadyError());

    const totalsResult = await this.resolveTotals(cart);
    if (totalsResult.isErr()) return err(totalsResult.error);
    const totals = totalsResult.value;

    const orderNumber = await this.orderNumberGenerator.nextOrderNumber(cart.storeId, cart.channel === 'web' ? 'WEB-' : 'POS-');
    const reservationExpiresAt = new Date(Date.now() + RESERVATION_TTL_MS);
    const order = Order.fromCart(cart, orderNumber, reservationExpiresAt, totals);
    try {
      await this.orderWriter.save(order);
    } catch (error) {
      if (error instanceof OrderAlreadyExistsForCartError) return err(error);
      throw error;
    }

    const reserved = await this.stockReservations.reserve({ orderId: order.id, expiresAt: reservationExpiresAt, lines: cart.lines });
    if (!reserved) {
      await this.orderWriter.delete(order.id);
      return err(new InsufficientStockError());
    }

    try {
      await this.orderWriter.save(order, {
        idempotency: { key: input.idempotencyKey, requestHash, expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS) },
        outbox: [{ name: 'order.created', payload: eventPayload(order) as unknown as Record<string, unknown> }],
      });
    } catch (error) {
      await this.stockReservations.release(order.id);
      await this.orderWriter.delete(order.id);
      if (error instanceof IdempotencyConflictError || error instanceof OrderAlreadyExistsForCartError) return err(error);
      throw error;
    }
    await this.carts.markOrdered(cart.id);
    await this.emailQueue.enqueue({ orderId: order.id, templateCode: 'order.created', payload: { orderNumber: order.orderNumber } });
    return ok(toOrderOutput(order));
  }

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

function hashPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
