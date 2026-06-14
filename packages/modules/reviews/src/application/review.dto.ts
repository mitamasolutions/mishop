import type { ProductRatingAggregate, ReviewProps } from '../domain/review.models';

export type ReviewOutput = Omit<ReviewProps, 'createdAt' | 'updatedAt' | 'moderatedAt'> & {
  createdAt: string;
  updatedAt: string;
  moderatedAt: string | null;
};

export type ProductRatingOutput = ProductRatingAggregate;

export function toReviewOutput(review: ReviewProps): ReviewOutput {
  return {
    ...review,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    moderatedAt: review.moderatedAt?.toISOString() ?? null,
  };
}
