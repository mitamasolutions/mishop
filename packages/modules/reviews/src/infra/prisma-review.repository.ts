import { Injectable } from '@nestjs/common';
import { roundMoney } from '@mitama/core';
import { PrismaService } from '@mitama/db';
import type { ProductRatingAggregate, ReviewProps, ReviewStatus } from '../domain/review.models';
import type { ReviewRepository } from '../domain/review.repository';

@Injectable()
export class PrismaReviewRepository implements ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(review: ReviewProps): Promise<void> {
    await this.prisma.productReview.upsert({ where: { id: review.id }, create: toRow(review), update: toRow(review) });
  }

  async findById(storeId: string, id: string): Promise<ReviewProps | null> {
    const row = await this.prisma.productReview.findFirst({ where: { id, storeId } });
    return row ? toDomain(row) : null;
  }

  async findByCustomerAndProduct(storeId: string, customerId: string, productId: string): Promise<ReviewProps | null> {
    const row = await this.prisma.productReview.findUnique({ where: { storeId_productId_customerId: { storeId, productId, customerId } } });
    return row ? toDomain(row) : null;
  }

  async listByProduct(storeId: string, productId: string, status?: ReviewStatus): Promise<ReviewProps[]> {
    const rows = await this.prisma.productReview.findMany({ where: { storeId, productId, status }, orderBy: { createdAt: 'desc' } });
    return rows.map(toDomain);
  }

  async getAggregate(storeId: string, productId: string): Promise<ProductRatingAggregate> {
    const aggregate = await this.prisma.productReview.aggregate({ where: { storeId, productId, status: 'approved' }, _avg: { rating: true }, _count: { id: true } });
    return { storeId, productId, averageRating: roundMoney(aggregate._avg.rating ?? 0), reviewCount: aggregate._count.id };
  }
}

function toRow(review: ReviewProps) {
  return {
    id: review.id,
    storeId: review.storeId,
    productId: review.productId,
    customerId: review.customerId,
    rating: review.rating,
    title: review.title,
    body: review.body,
    status: review.status,
    moderatorId: review.moderatorId,
    moderationReason: review.moderationReason,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    moderatedAt: review.moderatedAt,
  };
}

function toDomain(row: { id: string; storeId: string; productId: string; customerId: string; rating: number; title: string | null; body: string; status: string; moderatorId: string | null; moderationReason: string | null; createdAt: Date; updatedAt: Date; moderatedAt: Date | null }): ReviewProps {
  return { ...row, status: row.status as ReviewStatus };
}
