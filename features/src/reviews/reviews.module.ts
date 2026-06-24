import { Module } from '@nestjs/common';
import { createModuleProviders, EVENT_BUS } from '@mitama/contracts';
import { ReviewsController } from './http/reviews.controller';
import { REVIEWS_TOKENS } from './reviews.tokens';
import { PrismaReviewRepository } from './infra/prisma-review.repository';
import { PrismaVerifiedPurchaseRepository } from './infra/prisma-verified-purchase.repository';
import { OrderEventsHandler } from './infra/order-events.handler';
import { CreateReviewUseCase, EditPendingReviewUseCase, GetProductRatingUseCase, ListProductReviewsUseCase, ModerateReviewUseCase } from './application/review-use-cases';

@Module({
  controllers: [ReviewsController],
  providers: createModuleProviders([
    { provide: REVIEWS_TOKENS.reviewRepository, useClass: PrismaReviewRepository },
    { provide: REVIEWS_TOKENS.verifiedPurchaseRepository, useClass: PrismaVerifiedPurchaseRepository },
    { provider: OrderEventsHandler, inject: [EVENT_BUS, REVIEWS_TOKENS.verifiedPurchaseRepository] },
    { useCase: CreateReviewUseCase, inject: [REVIEWS_TOKENS.reviewRepository, REVIEWS_TOKENS.verifiedPurchaseRepository] },
    { useCase: EditPendingReviewUseCase, inject: [REVIEWS_TOKENS.reviewRepository] },
    { useCase: ModerateReviewUseCase, inject: [REVIEWS_TOKENS.reviewRepository] },
    { useCase: GetProductRatingUseCase, inject: [REVIEWS_TOKENS.reviewRepository] },
    { useCase: ListProductReviewsUseCase, inject: [REVIEWS_TOKENS.reviewRepository] },
  ]),
})
export class ReviewsModule {}
