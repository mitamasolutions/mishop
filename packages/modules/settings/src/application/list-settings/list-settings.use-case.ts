import { ok, type Result, type UseCase } from '@mitama/core';
import { SETTINGS_CATALOG, type SettingKey } from '../../domain/settings-catalog';
import type { SettingRepository } from '../../domain/setting.repository';
import type { SettingOutput } from '../setting.dto';
import type { ListSettingsInput } from './list-settings.dto';

/** Lista el catálogo completo con su valor efectivo (override > global > default) en un scope. */
export class ListSettingsUseCase implements UseCase<ListSettingsInput, Result<SettingOutput[], never>> {
  constructor(private readonly settings: SettingRepository) {}

  async execute(input: ListSettingsInput): Promise<Result<SettingOutput[], never>> {
    const rows = await this.settings.findAllForScope(input.storeId);

    const outputs = (Object.keys(SETTINGS_CATALOG) as SettingKey[]).map((key) => {
      const definition = SETTINGS_CATALOG[key];
      const override = input.storeId ? rows.find((row) => row.storeId === input.storeId && row.key === key) : undefined;
      const global = rows.find((row) => row.storeId === null && row.key === key);
      const resolved = override ?? global;

      return {
        key,
        type: definition.type,
        value: resolved ? resolved.value : definition.default,
        storeId: input.storeId,
        source: override ? 'override' : global ? 'global' : 'default',
      } satisfies SettingOutput;
    });

    return ok(outputs);
  }
}
