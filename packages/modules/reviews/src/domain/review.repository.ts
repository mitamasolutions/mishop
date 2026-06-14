import type { ProductRatingAggregate, ReviewProps, ReviewStatus } from './review.models';

export interface ReviewRepository {
  save(review: ReviewProps): Promise<void>;
  findById(storeId: string, id: string): Promise<ReviewProps | null>;
  findByCustomerAndProduct(storeId: string, customerId: string, productId: string): Promise<ReviewProps | null>;
  listByProduct(storeId: string, productId: string, status?: ReviewStatus): Promise<ReviewProps[]>;
  getAggregate(storeId: string, productId: string): Promise<ProductRatingAggregate>;
}

export interface VerifiedPurchaseEntry {
  storeId: string;
  customerId: string;
  productId: string;
  orderId: string;
}

/**
 * Proyección local alimentada por eventos de `orders` (order.completed) y
 * revocada por order.refunded / order.cancelled. Reemplaza la lectura
 * directa del schema de orders (boundary entre módulos).
 */
export interface VerifiedPurchaseRepository {
  hasVerifiedPurchase(storeId: string, customerId: string, productId: string): Promise<boolean>;
  record(entries: VerifiedPurchaseEntry[]): Promise<void>;
  removeByOrder(storeId: string, orderId: string): Promise<void>;
}
