export interface CreateCategoryInput {
  name: string;
  description?: string | null;
  handle?: string | null;
  parentCategoryId?: string | null;
  isActive?: boolean;
  isInternal?: boolean;
  rank?: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  actorUserId: string | null;
}
