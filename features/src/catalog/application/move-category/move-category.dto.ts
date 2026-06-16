export interface MoveCategoryInput {
  id: string;
  parentCategoryId: string | null;
  rank: number;
  actorUserId: string | null;
}
