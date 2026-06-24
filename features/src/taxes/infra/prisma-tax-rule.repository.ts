import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/data';
import type { TaxCategory } from '../domain/tax-provider';
import type { TaxRule, TaxRuleRepository } from '../domain/tax-rule.repository';

@Injectable()
export class PrismaTaxRuleRepository implements TaxRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByRegion(regionId: string): Promise<TaxRule[]> {
    const rows = await this.prisma.taxRule.findMany({ where: { regionId } });
    return rows.map((row) => ({ id: row.id, regionId: row.regionId, category: row.category as TaxCategory, rate: Number(row.rate) }));
  }

  async save(rule: TaxRule): Promise<void> {
    await this.prisma.taxRule.upsert({ where: { regionId_category: { regionId: rule.regionId, category: rule.category } }, create: rule, update: { rate: rule.rate } });
  }
}
