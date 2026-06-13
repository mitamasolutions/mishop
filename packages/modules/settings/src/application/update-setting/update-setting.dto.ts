import type { SettingValue } from '../../domain/settings-catalog';

export interface UpdateSettingInput {
  actorUserId: string;
  key: string;
  storeId: string | null;
  value: SettingValue;
}
