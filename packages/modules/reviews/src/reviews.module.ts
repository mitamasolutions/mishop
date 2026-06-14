import { Module } from '@nestjs/common';
import { EVENT_BUS } from '@mitama/contracts';
import type { EventBus } from '@mitama/core';
import { ReviewsController } from './http/reviews.controller';
import { REVIEWS_TOKENS } from './reviews.tokens';
import { PrismaReviewRepository } from './infra/prisma-review.repository';
import { PrismaVerifiedPurchaseRepository } from './infra/prisma-verified-purchase.repository';
import { OrderEventsHandler } from './infra/order-events.handler';
import type { ReviewRepository, VerifiedPurchaseRepository } from './domain/review.repository';
import { CreateReviewUseCase, EditPendingReviewUseCase, GetProductRatingUseCase, ListProductReviewsUseCase, ModerateReviewUseCase } from './application/review-use-cases';

@Module({
  controllers: [ReviewsController],
  providers: [
    { provide: REVIEWS_TOKENS.reviewRepository, useClass: PrismaReviewRepository },
    { provide: REVIEWS_TOKENS.verifiedPurchaseRepository, useClass: PrismaVerifiedPurchaseRepository },
    {
      provide: OrderEventsHandler,
      useFactory: (eventBus: EventBus, purchases: VerifiedPurchaseRepository) => new OrderEventsHandler(eventBus, purchases),
      inject: [EVENT_BUS, REVIEWS_TOKENS.verifiedPurchaseRepository],
    },
    { provide: CreateReviewUseCase, useFactory: (repo: ReviewRepository, purchases: VerifiedPurchaseRepository) => new CreateReviewUseCase(repo, purchases), inject: [REVIEWS_TOKENS.reviewRepository, REVIEWS_TOKENS.verifiedPurchaseRepository] },
    { provide: EditPendingReviewUseCase, useFactory: (repo: ReviewRepository) => new EditPendingReviewUseCase(repo), inject: [REVIEWS_TOKENS.reviewRepository] },
    { provide: ModerateReviewUseCase, useFactory: (repo: ReviewRepository) => new ModerateReviewUseCase(repo), inject: [REVIEWS_TOKENS.reviewRepository] },
    { provide: GetProductRatingUseCase, useFactory: (repo: ReviewRepository) => new GetProductRatingUseCase(repo), inject: [REVIEWS_TOKENS.reviewRepository] },
    { provide: ListProductReviewsUseCase, useFactory: (repo: ReviewRepository) => new ListProductReviewsUseCase(repo), inject: [REVIEWS_TOKENS.reviewRepository] },
  ],
})
export class ReviewsModule {}
