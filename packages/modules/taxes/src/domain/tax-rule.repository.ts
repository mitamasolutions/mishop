import type { TaxCategory } from './tax-provider';

export interface TaxRule {
  id: string;
  regionId: string;
  category: TaxCategory;
  rate: number;
}

export interface TaxRuleRepository {
  findByRegion(regionId: string): Promise<TaxRule[]>;
  save(rule: TaxRule): Promise<void>;
}
