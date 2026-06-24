import type { PriceListStatus } from '../../domain/price-list.entity';
import type { PriceListOutput } from '../price-list.dto';

export interface ListPriceListsInput {
  status?: PriceListStatus;
  page?: number;
  pageSize?: number;
}

export interface ListPriceListsOutput {
  items: PriceListOutput[];
  total: number;
  page: number;
  pageSize: number;
}
