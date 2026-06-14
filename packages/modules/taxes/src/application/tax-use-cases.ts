import { err, type Result, type UseCase } from '@mitama/core';
import type { TaxCalculationInput, TaxCalculationOutput, TaxProviderRegistry } from '../domain/tax-provider';
import type { StoreTaxSettingsRepository } from '../domain/store-tax-settings.repository';

export class CalculateTaxesUseCase implements UseCase<Omit<TaxCalculationInput, 'pricesIncludeTax'> & { pricesIncludeTax?: boolean }, Result<TaxCalculationOutput, Error>> {
  constructor(
    private readonly settings: StoreTaxSettingsRepository,
    private readonly registry: TaxProviderRegistry,
  ) {}

  async execute(input: Omit<TaxCalculationInput, 'pricesIncludeTax'> & { pricesIncludeTax?: boolean }): Promise<Result<TaxCalculationOutput, Error>> {
    const settings = await this.settings.findByStore(input.storeId);
    const provider = this.registry.get(settings?.providerCode ?? 'mx-iva');
    if (!provider) return err(new Error('No se encontró provider de impuestos'));
    return provider.calculate({ ...input, regionId: settings?.regionId ?? input.regionId, pricesIncludeTax: input.pricesIncludeTax ?? settings?.pricesIncludeTax ?? false });
  }
}
