export interface UpdateStockLocationInput {
  id: string;
  name?: string;
  metadata?: Record<string, unknown> | null;
  actorUserId: string | null;
}
