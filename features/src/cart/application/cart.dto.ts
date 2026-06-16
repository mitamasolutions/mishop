import type { Cart, CartLineProps } from '../domain/cart.entity';

export interface CartOutput {
  id: string;
  storeId: string;
  channel: string;
  token: string;
  customerId: string | null;
  status: string;
  checkoutStep: string;
  lines: CartLineOutput[];
  shippingAddress: unknown;
  billingAddress: unknown;
  shippingMethod: unknown;
  paymentMethod: unknown;
  totals: { currencyCode: string | null; subtotal: number; shipping: number; total: number };
  expiresAt: string;
}

export interface CartLineOutput extends Omit<CartLineProps, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

export function toCartOutput(cart: Cart): CartOutput {
  return {
    id: cart.id,
    storeId: cart.storeId,
    channel: cart.channel,
    token: cart.token,
    customerId: cart.customerId,
    status: cart.status,
    checkoutStep: cart.checkoutStep,
    lines: cart.lines.map((line) => ({ ...line, createdAt: line.createdAt.toISOString(), updatedAt: line.updatedAt.toISOString() })),
    shippingAddress: cart.shippingAddress,
    billingAddress: cart.billingAddress,
    shippingMethod: cart.shippingMethod,
    paymentMethod: cart.paymentMethod,
    totals: cart.totals(),
    expiresAt: cart.expiresAt.toISOString(),
  };
}
