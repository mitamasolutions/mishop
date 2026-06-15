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
  /**
   * Categoría fiscal de la línea (`standard | zero | exempt`). Si la variante
   * no la define, se usa la del producto; si el producto tampoco la define,
   * se pasa `null` y el resolver aplica `standard` con advertencia
   * (r13 · sprint1_cierre).
   */
  taxCategory: string | null;
  /**
   * Peso por unidad en kg (la variante manda; si falta cae al producto;
   * si tampoco hay, cuenta como 0).
   */
  weightKg: number;
}

export interface CheckoutCartSnapshot {
  id: string;
  storeId: string;
  /**
   * Región fiscal de la tienda (`StoreTaxSetting.regionId`). Necesaria para
   * el cálculo server-side de impuestos (r13 · sprint1_cierre). Si la tienda
   * no la tiene configurada, el cart reader debe rechazar el carrito.
   */
  regionId: string;
  /** Si los precios del catálogo de la tienda ya incluyen impuesto. */
  pricesIncludeTax: boolean;
  channel: 'web' | 'pos';
  customerId: string;
  email: string | null;
  shippingAddress: Record<string, unknown>;
  billingAddress: Record<string, unknown>;
  /**
   * Método elegido por el comprador. El monto **se ignora** server-side: el
   * resolver server-side calcula el costo real y valida elegibilidad por zona.
   */
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
