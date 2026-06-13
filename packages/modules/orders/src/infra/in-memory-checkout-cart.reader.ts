import type { CheckoutCartReader, CheckoutCartSnapshot } from '../domain/checkout-cart';

export class InMemoryCheckoutCartReader implements CheckoutCartReader {
  readonly carts = new Map<string, CheckoutCartSnapshot>();
  readonly ordered = new Set<string>();

  async getReadyCart(cartId: string): Promise<CheckoutCartSnapshot | null> {
    return this.carts.get(cartId) ?? null;
  }

  async markOrdered(cartId: string): Promise<void> {
    this.ordered.add(cartId);
  }
}
