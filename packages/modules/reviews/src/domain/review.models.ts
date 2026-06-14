export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ReviewProps {
  id: string;
  storeId: string;
  productId: string;
  customerId: string;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  moderatorId: string | null;
  moderationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  moderatedAt: Date | null;
}

export interface ProductRatingAggregate {
  storeId: string;
  productId: string;
  averageRating: number;
  reviewCount: number;
}
