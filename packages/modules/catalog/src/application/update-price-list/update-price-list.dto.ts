import type { PriceListType } from '../../domain/price-list.entity';

export interface UpdatePriceListInput {
  id: string;
  title?: string;
  description?: string | null;
  type?: PriceListType;
  startsAt?: string | null;
  endsAt?: string | null;
  actorUserId: string | null;
}
