export interface CreateStoreInput {
  name: string;
  code: string;
  url?: string | null;
  currencyCode: string;
  regionId: string;
  actorUserId: string | null;
}
