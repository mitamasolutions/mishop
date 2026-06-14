import { describe, expect, it } from 'vitest';
import { TaxProviderRegistry } from '../domain/tax-provider';
import { InMemoryStoreTaxSettingsRepository } from '../infra/in-memory-store-tax-settings.repository';
import { InMemoryTaxRuleRepository } from '../infra/in-memory-tax-rule.repository';
import { MxIvaTaxProvider } from '../infra/mx-iva-tax-provider';
import { CalculateTaxesUseCase } from './tax-use-cases';

describe('tax calculation', () => {
  function setup(pricesIncludeTax = false) {
    const rules = new InMemoryTaxRuleRepository();
    const settings = new InMemoryStoreTaxSettingsRepository();
    void settings.save({ storeId: 'store-1', regionId: 'mx', providerCode: 'mx-iva', pricesIncludeTax });
    return new CalculateTaxesUseCase(settings, new TaxProviderRegistry([new MxIvaTaxProvider(rules)]));
  }

  it('calcula IVA por categoría standard, tasa cero y exento', async () => {
    const result = await setup().execute({
      storeId: 'store-1',
      regionId: 'mx',
      lines: [
        { lineId: 'standard', productId: 'p1', variantId: 'v1', quantity: 1, unitPrice: 100, taxCategory: 'standard' },
        { lineId: 'zero', productId: 'p2', variantId: 'v2', quantity: 1, unitPrice: 100, taxCategory: 'zero' },
        { lineId: 'exempt', productId: 'p3', variantId: 'v3', quantity: 1, unitPrice: 100, taxCategory: 'exempt' },
      ],
    });

    expect(result.isOk()).toBe(true);
    expect(result.value.taxTotal).toBe(16);
    expect(result.value.total).toBe(316);
  });

  it('separa base e impuesto cuando el precio incluye IVA', async () => {
    const result = await setup(true).execute({
      storeId: 'store-1',
      regionId: 'mx',
      lines: [{ lineId: 'standard', productId: 'p1', variantId: 'v1', quantity: 1, unitPrice: 116, taxCategory: 'standard' }],
    });

    expect(result.isOk()).toBe(true);
    expect(result.value.subtotal).toBe(100);
    expect(result.value.taxTotal).toBe(16);
    expect(result.value.total).toBe(116);
  });
});
