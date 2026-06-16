import type { Order, OrderLineProps, OrderNoteProps, StateTransitionProps } from '../domain/order.entity';

export interface OrderOutput {
  id: string;
  storeId: string;
  orderNumber: string;
  cartId: string;
  customerId: string;
  customerEmail: string | null;
  channel: string;
  status: string;
  paymentStatus: string;
  currencyCode: string;
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  shippingAddress: Record<string, unknown>;
  billingAddress: Record<string, unknown>;
  shippingMethod: Record<string, unknown>;
  paymentMethod: Record<string, unknown>;
  reservationExpiresAt: string | null;
  lines: OrderLineProps[];
  transitions: Array<Omit<StateTransitionProps, 'createdAt'> & { createdAt: string }>;
  notes: Array<Omit<OrderNoteProps, 'createdAt'> & { createdAt: string }>;
  createdAt: string;
  updatedAt: string;
}

export function toOrderOutput(order: Order): OrderOutput {
  return {
    id: order.id,
    storeId: order.storeId,
    orderNumber: order.orderNumber,
    cartId: order.cartId,
    customerId: order.customerId,
    customerEmail: order.customerEmail,
    channel: order.channel,
    status: order.status,
    paymentStatus: order.paymentStatus,
    currencyCode: order.currencyCode,
    subtotal: order.subtotal,
    shippingTotal: order.shippingTotal,
    taxTotal: order.taxTotal,
    total: order.total,
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    shippingMethod: order.shippingMethod,
    paymentMethod: order.paymentMethod,
    reservationExpiresAt: order.reservationExpiresAt?.toISOString() ?? null,
    lines: order.lines,
    transitions: order.transitions.map((transition) => ({ ...transition, createdAt: transition.createdAt.toISOString() })),
    notes: order.notes.map((note) => ({ ...note, createdAt: note.createdAt.toISOString() })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
