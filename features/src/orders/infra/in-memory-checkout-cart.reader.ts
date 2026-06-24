import type { CheckoutCartReader, CheckoutCartSnapshot } from '../domain/checkout-cart';

export class InMemoryCheckoutCartReader implements CheckoutCartReader {
  readonly carts = new Map<string, CheckoutCartSnapshot>();
  readonly ordered = new Set<string>();

  async getReadyCart(cartId: string): Promise<CheckoutCartSnapshot | null> {
    // Un carrito ya ordenado deja de estar "listo" (igual que el adapter Prisma,
    // que filtra por status='active').
    if (this.ordered.has(cartId)) return null;
    return this.carts.get(cartId) ?? null;
  }

  async getCartStoreId(cartId: string): Promise<string | null> {
    return this.carts.get(cartId)?.storeId ?? null;
  }

  async markOrdered(cartId: string): Promise<void> {
    this.ordered.add(cartId);
  }
}
