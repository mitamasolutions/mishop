import type { Cart } from './cart.entity';

export interface CartRepository {
  findById(id: string): Promise<Cart | null>;
  findActiveByToken(token: string, storeId: string, channel: string): Promise<Cart | null>;
  findActiveByCustomer(customerId: string, storeId: string, channel: string): Promise<Cart | null>;
  findExpired(now: Date): Promise<Cart[]>;
  save(cart: Cart): Promise<void>;
  delete(cartId: string): Promise<void>;
}
