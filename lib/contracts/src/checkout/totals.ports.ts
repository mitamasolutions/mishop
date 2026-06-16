/**
 * Puertos de **resolución server-side de totales** para el checkout
 * (r13 · sprint1_cierre). Viven en contracts para que `orders` los consuma
 * sin importar internals de `taxes` ni `shipping`. Los adapters reales
 * viven en los módulos dueños del dominio.
 */

export interface CheckoutTaxLineInput {
  /** Identificador estable de la línea (cartLineId o variantId). */
  lineId: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  /**
   * Categoría fiscal de la línea (`standard | zero | exempt`). Si es `null`
   * el resolver aplica `standard` y registra una advertencia.
   */
  taxCategory: string | null;
}

export interface CheckoutTaxCalculationInput {
  storeId: string;
  regionId: string;
  /** Si los precios del catálogo ya incluyen impuesto. */
  pricesIncludeTax: boolean;
  lines: CheckoutTaxLineInput[];
}

export interface CheckoutTaxLineResult {
  lineId: string;
  taxCategory: 'standard' | 'zero' | 'exempt';
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
}

export interface CheckoutTaxCalculationResult {
  /** Suma del impuesto sobre el subtotal de productos (envío NO se grava). */
  taxTotal: number;
  /** Suma del subtotal ex-tax (taxableAmount por línea). */
  subtotal: number;
  total: number;
  lines: CheckoutTaxLineResult[];
  /** Advertencias no bloqueantes (p. ej. línea sin categoría). */
  warnings: string[];
}

export interface CheckoutTaxResolverPort {
  calculate(input: CheckoutTaxCalculationInput): Promise<CheckoutTaxCalculationResult>;
}

export const CHECKOUT_TAX_RESOLVER_PORT = 'mitama.checkout-tax-resolver-port';

// --- Shipping ---------------------------------------------------------------

export interface CheckoutShippingAddress {
  countryCode?: string;
  regionCode?: string;
  territoryId?: string;
  zoneId?: string;
}

export interface CheckoutShippingResolveInput {
  storeId: string;
  /** Id del método elegido por el comprador (`StoreShippingMethod.id`). */
  methodId: string;
  address: CheckoutShippingAddress | null;
  /** Subtotal ex-tax del carrito (para reglas `free_over_amount`). */
  subtotal: number;
  /** Peso total del carrito en kg (suma de `quantity * weight` por línea). */
  weightKg: number;
}

export interface CheckoutShippingResolved {
  methodId: string;
  providerCode: string;
  name: string;
  amount: number;
}

export type CheckoutShippingResolveError =
  | { code: 'method-not-found'; message: string }
  | { code: 'method-disabled'; message: string }
  | { code: 'method-not-eligible-for-zone'; message: string };

/**
 * Resultado del resolver de envío. Tipo discriminado simple para no acoplar
 * `orders` con `Result` de `@mitama/core` desde `contracts`.
 */
export type CheckoutShippingResolveResult =
  | { ok: true; value: CheckoutShippingResolved }
  | { ok: false; error: CheckoutShippingResolveError };

export interface CheckoutShippingResolverPort {
  resolve(input: CheckoutShippingResolveInput): Promise<CheckoutShippingResolveResult>;
}

export const CHECKOUT_SHIPPING_RESOLVER_PORT = 'mitama.checkout-shipping-resolver-port';
