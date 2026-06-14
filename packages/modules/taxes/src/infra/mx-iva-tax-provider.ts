import { ok, type Result } from '@mitama/core';
import type { TaxCalculationInput, TaxCalculationOutput, TaxCategory, TaxProvider } from '../domain/tax-provider';
import type { TaxRuleRepository } from '../domain/tax-rule.repository';

export class MxIvaTaxProvider implements TaxProvider {
  readonly code = 'mx-iva';

  constructor(private readonly rules: TaxRuleRepository) {}

  async calculate(input: TaxCalculationInput): Promise<Result<TaxCalculationOutput, Error>> {
    const warnings: string[] = [];
    const rules = await this.rules.findByRegion(input.regionId);
    if (rules.length === 0) warnings.push(`No hay reglas de impuesto para la región ${input.regionId}; se aplica 0 %`);
    const byCategory = new Map(rules.map((rule) => [rule.category, rule.rate]));
    const lines = input.lines.map((line) => {
      const category: TaxCategory = line.taxCategory ?? 'standard';
      if (!line.taxCategory) warnings.push(`La línea ${line.lineId} no tiene categoría fiscal; se usa standard`);
      const rate = byCategory.get(category) ?? 0;
      const grossOrBase = roundMoney(line.unitPrice * line.quantity);
      const taxableAmount = input.pricesIncludeTax && rate > 0 ? roundMoney(grossOrBase / (1 + rate)) : grossOrBase;
      const taxAmount = input.pricesIncludeTax ? roundMoney(grossOrBase - taxableAmount) : roundMoney(taxableAmount * rate);
      return { lineId: line.lineId, taxCategory: category, taxRate: rate, taxableAmount, taxAmount, total: input.pricesIncludeTax ? grossOrBase : roundMoney(taxableAmount + taxAmount) };
    });
    const taxTotal = roundMoney(lines.reduce((sum, line) => sum + line.taxAmount, 0));
    const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.taxableAmount, 0));
    const total = roundMoney(lines.reduce((sum, line) => sum + line.total, 0));
    return ok({ taxTotal, subtotal, total, lines, warnings });
  }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
