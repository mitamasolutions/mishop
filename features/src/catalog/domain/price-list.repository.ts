import type { RecordActivityInput } from '../../activity-log';
import { PriceList, type PriceListStatus } from './price-list.entity';

export interface PriceListFilter {
  status?: PriceListStatus;
  page?: number;
  pageSize?: number;
}

export interface PriceListPage {
  items: PriceList[];
  total: number;
  page: number;
  pageSize: number;
}

/** Puerto de persistencia de listas de precios. infra/ lo implementa con Prisma. */
export interface PriceListRepository {
  findById(id: string): Promise<PriceList | null>;
  findAll(filter: PriceListFilter): Promise<PriceListPage>;
  /** Listas activas (independientemente de vigencia, que se evalúa en memoria). */
  findActive(): Promise<PriceList[]>;
  create(priceList: PriceList, activity: RecordActivityInput): Promise<void>;
  update(priceList: PriceList, activity: RecordActivityInput): Promise<void>;
  remove(priceList: PriceList, activity: RecordActivityInput): Promise<void>;
}
