import { Cart } from '../domain/cart.entity';
import type { CartRepository } from '../domain/cart.repository';

export class InMemoryCartRepository implements CartRepository {
  private readonly carts = new Map<string, Cart>();

  async findById(id: string): Promise<Cart | null> {
    return this.carts.get(id) ?? null;
  }

  async findActiveByToken(token: string, storeId: string, channel: string): Promise<Cart | null> {
    return [...this.carts.values()].find((cart) => cart.token === token && cart.storeId === storeId && cart.channel === channel && cart.status === 'active') ?? null;
  }

  async findActiveByCustomer(customerId: string, storeId: string, channel: string): Promise<Cart | null> {
    return [...this.carts.values()].find((cart) => cart.customerId === customerId && cart.storeId === storeId && cart.channel === channel && cart.status === 'active') ?? null;
  }

  async findExpired(now: Date): Promise<Cart[]> {
    return [...this.carts.values()].filter((cart) => cart.status === 'active' && cart.expiresAt <= now);
  }

  async save(cart: Cart): Promise<void> {
    this.carts.set(cart.id, cart);
  }

  async delete(cartId: string): Promise<void> {
    this.carts.delete(cartId);
  }
}
