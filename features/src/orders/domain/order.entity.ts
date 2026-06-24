import { Entity } from '@mitama/core';
import { CompletedOrderCannotBeCancelledError, InvalidOrderStateTransitionError, InvalidPaymentStateTransitionError } from './errors';
import type { CheckoutCartSnapshot } from './checkout-cart';

export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type OrderPaymentStatus = 'pending' | 'authorized' | 'paid' | 'partially_refunded' | 'refunded' | 'failed' | 'voided' | 'cancelled';

export interface OrderLineProps {
  id: string;
  variantId: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  quantity: number;
  currencyCode: string;
  unitPrice: number;
  taxAmount: number;
  total: number;
  stockLocationId: string;
}

export interface StateTransitionProps {
  id: string;
  kind: 'order' | 'payment';
  from: string;
  to: string;
  actorId: string | null;
  reason: string | null;
  createdAt: Date;
}

export interface OrderNoteProps {
  id: string;
  authorId: string;
  body: string;
  createdAt: Date;
}

/**
 * Totales recalculados server-side por el `CreateOrderUseCase` antes de
 * construir la orden. Son la **única fuente de verdad**: los valores que
 * el cliente pone en el carrito (currentUnitPrice, shippingMethod.amount,
 * taxTotal) NO se usan al crear la orden (r13 · sprint1_cierre).
 */
export interface OrderTotalsBreakdown {
  /** Subtotal ex-tax sumando taxableAmount por línea. */
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  /**
   * Impuesto resuelto por línea, indexado por `cartLineId` (clave estable
   * del snapshot del carrito).
   */
  taxByCartLineId: Record<string, number>;
  /**
   * Método de envío resuelto server-side: id, nombre, monto real y código de
   * proveedor. Reemplaza al `cart.shippingMethod` enviado por el cliente.
   */
  shippingMethod: { id: string; providerCode: string; name: string; amount: number };
}

interface OrderProps {
  storeId: string;
  orderNumber: string;
  cartId: string;
  customerId: string;
  customerEmail: string | null;
  channel: 'web' | 'pos';
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  currencyCode: string;
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  shippingAddress: Record<string, unknown>;
  billingAddress: Record<string, unknown>;
  shippingMethod: Record<string, unknown>;
  paymentMethod: Record<string, unknown>;
  reservationExpiresAt: Date | null;
  lines: OrderLineProps[];
  transitions: StateTransitionProps[];
  notes: OrderNoteProps[];
  createdAt: Date;
  updatedAt: Date;
}

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const PAYMENT_TRANSITIONS: Record<OrderPaymentStatus, OrderPaymentStatus[]> = {
  pending: ['authorized', 'paid', 'failed', 'cancelled'],
  authorized: ['paid', 'failed', 'voided', 'cancelled'],
  paid: ['partially_refunded', 'refunded', 'failed'],
  partially_refunded: ['refunded'],
  refunded: [],
  voided: [],
  cancelled: [],
  failed: [],
};

export class Order extends Entity<OrderProps> {
  static fromCart(
    cart: CheckoutCartSnapshot,
    orderNumber: string,
    reservationExpiresAt: Date,
    totals: OrderTotalsBreakdown,
  ): Order {
    const now = new Date();
    const lines = cart.lines.map<OrderLineProps>((line) => {
      const taxAmount = totals.taxByCartLineId[line.cartLineId] ?? 0;
      const lineSubtotal = line.unitPrice * line.quantity;
      return {
        id: crypto.randomUUID(),
        variantId: line.variantId,
        productId: line.productId,
        productTitle: line.productTitle,
        variantTitle: line.variantTitle,
        sku: line.sku,
        quantity: line.quantity,
        currencyCode: line.currencyCode,
        unitPrice: line.unitPrice,
        taxAmount,
        total: lineSubtotal + taxAmount,
        stockLocationId: line.stockLocationId,
      };
    });
    return new Order(crypto.randomUUID(), {
      storeId: cart.storeId,
      orderNumber,
      cartId: cart.id,
      customerId: cart.customerId,
      customerEmail: cart.email,
      channel: cart.channel,
      status: 'pending',
      paymentStatus: 'pending',
      currencyCode: lines[0]?.currencyCode ?? 'USD',
      subtotal: totals.subtotal,
      shippingTotal: totals.shippingTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      shippingAddress: cart.shippingAddress,
      billingAddress: cart.billingAddress,
      // Snapshot inmutable del método resuelto server-side: id, nombre,
      // monto real y código de proveedor (r13 · sprint1_cierre).
      shippingMethod: { ...totals.shippingMethod },
      paymentMethod: cart.paymentMethod,
      reservationExpiresAt,
      lines,
      transitions: [],
      notes: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: OrderProps, id: string): Order {
    return new Order(id, props);
  }

  get storeId(): string { return this.props.storeId; }
  get orderNumber(): string { return this.props.orderNumber; }
  get cartId(): string { return this.props.cartId; }
  get customerId(): string { return this.props.customerId; }
  get customerEmail(): string | null { return this.props.customerEmail; }
  get channel(): 'web' | 'pos' { return this.props.channel; }
  get status(): OrderStatus { return this.props.status; }
  get paymentStatus(): OrderPaymentStatus { return this.props.paymentStatus; }
  get currencyCode(): string { return this.props.currencyCode; }
  get subtotal(): number { return this.props.subtotal; }
  get shippingTotal(): number { return this.props.shippingTotal; }
  get taxTotal(): number { return this.props.taxTotal; }
  get total(): number { return this.props.total; }
  get shippingAddress(): Record<string, unknown> { return { ...this.props.shippingAddress }; }
  get billingAddress(): Record<string, unknown> { return { ...this.props.billingAddress }; }
  get shippingMethod(): Record<string, unknown> { return { ...this.props.shippingMethod }; }
  get paymentMethod(): Record<string, unknown> { return { ...this.props.paymentMethod }; }
  get reservationExpiresAt(): Date | null { return this.props.reservationExpiresAt; }
  get lines(): OrderLineProps[] { return this.props.lines.map((line) => ({ ...line })); }
  get transitions(): StateTransitionProps[] { return this.props.transitions.map((transition) => ({ ...transition })); }
  get notes(): OrderNoteProps[] { return this.props.notes.map((note) => ({ ...note })); }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  transitionOrder(to: OrderStatus, actorId: string | null, reason: string | null): void {
    if (!ORDER_TRANSITIONS[this.props.status].includes(to)) throw new InvalidOrderStateTransitionError(this.props.status, to);
    this.recordTransition('order', this.props.status, to, actorId, reason);
    this.props.status = to;
    this.props.updatedAt = new Date();
  }

  transitionPayment(to: OrderPaymentStatus, actorId: string | null, reason: string | null): boolean {
    if (this.props.paymentStatus === to) return false;
    if (!PAYMENT_TRANSITIONS[this.props.paymentStatus].includes(to)) throw new InvalidPaymentStateTransitionError(this.props.paymentStatus, to);
    this.recordTransition('payment', this.props.paymentStatus, to, actorId, reason);
    this.props.paymentStatus = to;
    if (to === 'paid' && this.props.status === 'pending') {
      this.recordTransition('order', this.props.status, 'confirmed', actorId, 'Pago capturado');
      this.props.status = 'confirmed';
    }
    this.props.updatedAt = new Date();
    return true;
  }

  cancel(actorId: string | null, reason: string | null): void {
    if (this.props.status === 'completed') throw new CompletedOrderCannotBeCancelledError();
    if (this.props.status !== 'cancelled') this.transitionOrder('cancelled', actorId, reason);
  }

  addNote(authorId: string, body: string): void {
    this.props.notes.push({ id: crypto.randomUUID(), authorId, body, createdAt: new Date() });
    this.props.updatedAt = new Date();
  }

  private recordTransition(kind: 'order' | 'payment', from: string, to: string, actorId: string | null, reason: string | null): void {
    this.props.transitions.push({ id: crypto.randomUUID(), kind, from, to, actorId, reason, createdAt: new Date() });
  }
}
