export interface CreateStockLocationInput {
  name: string;
  metadata?: Record<string, unknown> | null;
  actorUserId: string | null;
}
