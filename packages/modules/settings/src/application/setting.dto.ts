import type { SettingKey, SettingType, SettingValue } from '../domain/settings-catalog';
import type { SettingSource } from '../domain/settings-cache';

export interface SettingOutput {
  key: SettingKey;
  type: SettingType;
  value: SettingValue;
  storeId: string | null;
  source: SettingSource;
}
