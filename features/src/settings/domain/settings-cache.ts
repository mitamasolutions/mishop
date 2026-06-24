import type { SettingValue } from './settings-catalog';

export type SettingSource = 'override' | 'global' | 'default';

export interface CachedSetting {
  value: SettingValue;
  source: SettingSource;
}

/**
 * Cache en memoria por proceso del valor efectivo de una clave en un scope
 * (tienda u global). Se invalida vía el evento `settings.updated`.
 */
export interface SettingsCache {
  get(key: string, storeId: string | null): CachedSetting | undefined;
  set(key: string, storeId: string | null, entry: CachedSetting): void;
  /** Invalida todas las entradas (de cualquier tienda) para esa clave. */
  invalidateKey(key: string): void;
}
