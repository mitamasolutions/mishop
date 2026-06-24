export interface UpdateCategoryInput {
  id: string;
  name?: string;
  description?: string | null;
  handle?: string | null;
  isActive?: boolean;
  isInternal?: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  actorUserId: string | null;
}
