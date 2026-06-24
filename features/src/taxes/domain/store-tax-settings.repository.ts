export interface StoreTaxSettings {
  storeId: string;
  regionId: string;
  providerCode: string;
  pricesIncludeTax: boolean;
}

export interface StoreTaxSettingsRepository {
  findByStore(storeId: string): Promise<StoreTaxSettings | null>;
  save(settings: StoreTaxSettings): Promise<void>;
}
