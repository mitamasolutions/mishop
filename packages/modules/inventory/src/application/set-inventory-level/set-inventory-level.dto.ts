export interface SetInventoryLevelInput {
  itemId: string;
  locationId: string;
  stockedQuantity?: number;
  incomingQuantity?: number;
  actorUserId: string | null;
}
