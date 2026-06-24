import { Injectable } from '@nestjs/common';
import type { StoreTaxSettings, StoreTaxSettingsRepository } from '../domain/store-tax-settings.repository';

@Injectable()
export class InMemoryStoreTaxSettingsRepository implements StoreTaxSettingsRepository {
  private readonly settings = new Map<string, StoreTaxSettings>();

  constructor() {
    void this.save({ storeId: 'default', regionId: 'mx', providerCode: 'mx-iva', pricesIncludeTax: false });
  }

  async findByStore(storeId: string): Promise<StoreTaxSettings | null> {
    return this.settings.get(storeId) ?? this.settings.get('default') ?? null;
  }

  async save(settings: StoreTaxSettings): Promise<void> {
    this.settings.set(settings.storeId, { ...settings });
  }
}
