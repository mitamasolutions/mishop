import { err, ok, type Result, type UseCase } from '@mitama/core';
import { DuplicateReviewError, ReviewNotEditableError, ReviewNotFoundError, ReviewValidationError, VerifiedPurchaseRequiredError } from '../domain/errors';
import type { ReviewRepository, VerifiedPurchaseRepository } from '../domain/review.repository';
import type { ReviewProps, ReviewStatus } from '../domain/review.models';
import { toReviewOutput, type ProductRatingOutput, type ReviewOutput } from './review.dto';

export interface CreateReviewInput {
  storeId: string;
  productId: string;
  customerId: string;
  rating: number;
  title?: string | null;
  body: string;
}

export class CreateReviewUseCase implements UseCase<CreateReviewInput, Result<ReviewOutput, ReviewValidationError | VerifiedPurchaseRequiredError | DuplicateReviewError>> {
  constructor(
    private readonly reviews: ReviewRepository,
    private readonly purchases: VerifiedPurchaseRepository,
  ) {}

  async execute(input: CreateReviewInput): Promise<Result<ReviewOutput, ReviewValidationError | VerifiedPurchaseRequiredError | DuplicateReviewError>> {
    if (input.rating < 1 || input.rating > 5) return err(new ReviewValidationError('El rating debe estar entre 1 y 5'));
    const existing = await this.reviews.findByCustomerAndProduct(input.storeId, input.customerId, input.productId);
    if (existing) return err(new DuplicateReviewError());
    if (!(await this.purchases.hasVerifiedPurchase(input.storeId, input.customerId, input.productId))) return err(new VerifiedPurchaseRequiredError());
    const now = new Date();
    const review: ReviewProps = { ...input, id: crypto.randomUUID(), title: input.title ?? null, status: 'pending', moderatorId: null, moderationReason: null, createdAt: now, updatedAt: now, moderatedAt: null };
    await this.reviews.save(review);
    return ok(toReviewOutput(review));
  }
}

export class EditPendingReviewUseCase implements UseCase<{ storeId: string; id: string; rating?: number; title?: string | null; body?: string }, Result<ReviewOutput, ReviewNotFoundError | ReviewNotEditableError | ReviewValidationError>> {
  constructor(private readonly reviews: ReviewRepository) {}

  async execute(input: { storeId: string; id: string; rating?: number; title?: string | null; body?: string }): Promise<Result<ReviewOutput, ReviewNotFoundError | ReviewNotEditableError | ReviewValidationError>> {
    const review = await this.reviews.findById(input.storeId, input.id);
    if (!review) return err(new ReviewNotFoundError());
    if (review.status !== 'pending') return err(new ReviewNotEditableError());
    if (input.rating !== undefined) {
      if (input.rating < 1 || input.rating > 5) return err(new ReviewValidationError('El rating debe estar entre 1 y 5'));
      review.rating = input.rating;
    }
    if (input.title !== undefined) review.title = input.title;
    if (input.body !== undefined) review.body = input.body;
    review.updatedAt = new Date();
    await this.reviews.save(review);
    return ok(toReviewOutput(review));
  }
}

export class ModerateReviewUseCase implements UseCase<{ storeId: string; id: string; status: Exclude<ReviewStatus, 'pending'>; moderatorId: string; reason?: string | null }, Result<ReviewOutput, ReviewNotFoundError>> {
  constructor(private readonly reviews: ReviewRepository) {}

  async execute(input: { storeId: string; id: string; status: Exclude<ReviewStatus, 'pending'>; moderatorId: string; reason?: string | null }): Promise<Result<ReviewOutput, ReviewNotFoundError>> {
    const review = await this.reviews.findById(input.storeId, input.id);
    if (!review) return err(new ReviewNotFoundError());
    review.status = input.status;
    review.moderatorId = input.moderatorId;
    review.moderationReason = input.reason ?? null;
    review.moderatedAt = new Date();
    review.updatedAt = new Date();
    await this.reviews.save(review);
    return ok(toReviewOutput(review));
  }
}

export class GetProductRatingUseCase implements UseCase<{ storeId: string; productId: string }, Result<ProductRatingOutput, never>> {
  constructor(private readonly reviews: ReviewRepository) {}

  async execute(input: { storeId: string; productId: string }): Promise<Result<ProductRatingOutput, never>> {
    return ok(await this.reviews.getAggregate(input.storeId, input.productId));
  }
}

export class ListProductReviewsUseCase implements UseCase<{ storeId: string; productId: string; status?: ReviewStatus }, Result<ReviewOutput[], never>> {
  constructor(private readonly reviews: ReviewRepository) {}

  async execute(input: { storeId: string; productId: string; status?: ReviewStatus }): Promise<Result<ReviewOutput[], never>> {
    return ok((await this.reviews.listByProduct(input.storeId, input.productId, input.status)).map(toReviewOutput));
  }
}
