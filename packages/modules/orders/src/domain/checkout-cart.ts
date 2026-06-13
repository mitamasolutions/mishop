export interface CheckoutCartLineSnapshot {
  cartLineId: string;
  variantId: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  quantity: number;
  currencyCode: string;
  unitPrice: number;
  stockLocationId: string;
}

export interface CheckoutCartSnapshot {
  id: string;
  storeId: string;
  channel: 'web' | 'pos';
  customerId: string;
  email: string | null;
  shippingAddress: Record<string, unknown>;
  billingAddress: Record<string, unknown>;
  shippingMethod: { id: string; name: string; amount: number };
  paymentMethod: { provider: string; method: string };
  lines: CheckoutCartLineSnapshot[];
}

export interface CheckoutCartReader {
  getReadyCart(cartId: string): Promise<CheckoutCartSnapshot | null>;
  markOrdered(cartId: string): Promise<void>;
}
