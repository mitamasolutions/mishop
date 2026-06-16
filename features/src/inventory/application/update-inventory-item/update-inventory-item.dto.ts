export interface UpdateInventoryItemInput {
  id: string;
  sku?: string | null;
  title?: string | null;
  requiresShipping?: boolean;
  actorUserId: string | null;
}
