export interface CreateInventoryItemInput {
  sku?: string | null;
  title?: string | null;
  requiresShipping?: boolean;
  variantId?: string | null;
  requiredQuantity?: number;
  metadata?: Record<string, unknown> | null;
  actorUserId: string | null;
}
