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
  /**
   * Resuelve el storeId de un carrito en CUALQUIER estado (incluso ya
   * ordenado). Necesario para consultar idempotencia antes de validar que el
   * carrito esté listo: un replay no debe depender del estado del carrito.
   */
  getCartStoreId(cartId: string): Promise<string | null>;
  markOrdered(cartId: string): Promise<void>;
}
