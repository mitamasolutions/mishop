import type { PriceListStatus, PriceListType } from '../../domain/price-list.entity';

export interface CreatePriceListInput {
  title: string;
  description?: string | null;
  status?: PriceListStatus;
  type?: PriceListType;
  startsAt?: string | null;
  endsAt?: string | null;
  actorUserId: string | null;
}
