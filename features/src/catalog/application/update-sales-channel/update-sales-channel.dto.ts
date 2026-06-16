export interface UpdateSalesChannelInput {
  id: string;
  name?: string;
  description?: string | null;
  actorUserId: string | null;
}
