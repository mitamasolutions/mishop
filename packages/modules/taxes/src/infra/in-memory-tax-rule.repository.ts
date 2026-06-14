import { Injectable } from '@nestjs/common';
import type { TaxRule, TaxRuleRepository } from '../domain/tax-rule.repository';

@Injectable()
export class InMemoryTaxRuleRepository implements TaxRuleRepository {
  private readonly rules = new Map<string, TaxRule>();

  constructor() {
    void this.save({ id: 'mx-standard', regionId: 'mx', category: 'standard', rate: 0.16 });
    void this.save({ id: 'mx-zero', regionId: 'mx', category: 'zero', rate: 0 });
    void this.save({ id: 'mx-exempt', regionId: 'mx', category: 'exempt', rate: 0 });
  }

  async findByRegion(regionId: string): Promise<TaxRule[]> {
    return [...this.rules.values()].filter((rule) => rule.regionId === regionId);
  }

  async save(rule: TaxRule): Promise<void> {
    this.rules.set(rule.id, { ...rule });
  }
}
