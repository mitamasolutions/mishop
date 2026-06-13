export interface UpdateBrandInput {
  id: string;
  name?: string;
  handle?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  actorUserId: string | null;
}
