export interface UpdateProductInput {
  id: string;
  title?: string;
  handle?: string | null;
  subtitle?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  isGiftcard?: boolean;
  discountable?: boolean;
  weight?: number | null;
  length?: number | null;
  height?: number | null;
  width?: number | null;
  material?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  typeId?: string | null;
  brandId?: string | null;
  externalId?: string | null;
  metadata?: Record<string, unknown> | null;
  categoryIds?: string[];
  collectionIds?: string[];
  tagIds?: string[];
  salesChannelIds?: string[];
  actorUserId: string | null;
}
