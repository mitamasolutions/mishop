export interface UpdateStoreInput {
  id: string;
  name?: string;
  url?: string | null;
  currencyCode?: string;
  regionId?: string;
  actorUserId: string | null;
}
