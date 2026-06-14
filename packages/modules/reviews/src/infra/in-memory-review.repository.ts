import { Injectable } from '@nestjs/common';
import { roundMoney } from '@mitama/core';
import type { ProductRatingAggregate, ReviewProps, ReviewStatus } from '../domain/review.models';
import type { ReviewRepository, VerifiedPurchaseEntry, VerifiedPurchaseRepository } from '../domain/review.repository';

@Injectable()
export class InMemoryReviewRepository implements ReviewRepository {
  private readonly reviews = new Map<string, ReviewProps>();

  async save(review: ReviewProps): Promise<void> {
    this.reviews.set(review.id, { ...review });
  }

  async findById(storeId: string, id: string): Promise<ReviewProps | null> {
    const review = this.reviews.get(id);
    return review?.storeId === storeId ? { ...review } : null;
  }

  async findByCustomerAndProduct(storeId: string, customerId: string, productId: string): Promise<ReviewProps | null> {
    const review = [...this.reviews.values()].find((item) => item.storeId === storeId && item.customerId === customerId && item.productId === productId);
    return review ? { ...review } : null;
  }

  async listByProduct(storeId: string, productId: string, status?: ReviewStatus): Promise<ReviewProps[]> {
    return [...this.reviews.values()].filter((review) => review.storeId === storeId && review.productId === productId && (!status || review.status === status)).map((review) => ({ ...review }));
  }

  async getAggregate(storeId: string, productId: string): Promise<ProductRatingAggregate> {
    const approved = await this.listByProduct(storeId, productId, 'approved');
    const averageRating = approved.length === 0 ? 0 : roundMoney(approved.reduce((sum, review) => sum + review.rating, 0) / approved.length);
    return { storeId, productId, averageRating, reviewCount: approved.length };
  }
}

interface VerifiedPurchaseRow {
  storeId: string;
  customerId: string;
  productId: string;
  orderId: string;
}

@Injectable()
export class InMemoryVerifiedPurchaseRepository implements VerifiedPurchaseRepository {
  private readonly rows = new Map<string, VerifiedPurchaseRow>();

  async hasVerifiedPurchase(storeId: string, customerId: string, productId: string): Promise<boolean> {
    for (const row of this.rows.values()) {
      if (row.storeId === storeId && row.customerId === customerId && row.productId === productId) return true;
    }
    return false;
  }

  async record(entries: VerifiedPurchaseEntry[]): Promise<void> {
    for (const entry of entries) {
      this.rows.set(rowKey(entry), { ...entry });
    }
  }

  async removeByOrder(storeId: string, orderId: string): Promise<void> {
    for (const [key, row] of this.rows) {
      if (row.storeId === storeId && row.orderId === orderId) this.rows.delete(key);
    }
  }
}

function rowKey(entry: VerifiedPurchaseEntry): string {
  return `${entry.storeId}:${entry.customerId}:${entry.productId}:${entry.orderId}`;
}
