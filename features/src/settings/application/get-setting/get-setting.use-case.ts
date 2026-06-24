import { err, ok, type Result, type UseCase } from '@mitama/core';
import { isSettingKey, SETTINGS_CATALOG, type SettingKey } from '../../domain/settings-catalog';
import { UnknownSettingKeyError } from '../../domain/errors';
import type { SettingRepository } from '../../domain/setting.repository';
import type { CachedSetting, SettingsCache } from '../../domain/settings-cache';
import type { SettingOutput } from '../setting.dto';
import type { GetSettingInput } from './get-setting.dto';

export type GetSettingError = UnknownSettingKeyError;

/** Lee el valor efectivo de una clave (override de tienda > global > default), cacheado. */
export class GetSettingUseCase implements UseCase<GetSettingInput, Result<SettingOutput, GetSettingError>> {
  constructor(
    private readonly settings: SettingRepository,
    private readonly cache: SettingsCache,
  ) {}

  async execute(input: GetSettingInput): Promise<Result<SettingOutput, GetSettingError>> {
    if (!isSettingKey(input.key)) {
      return err(new UnknownSettingKeyError(input.key));
    }

    const definition = SETTINGS_CATALOG[input.key];
    const cached = this.cache.get(input.key, input.storeId);
    if (cached) {
      return ok({ key: input.key, type: definition.type, value: cached.value, storeId: input.storeId, source: cached.source });
    }

    const resolved = await this.resolve(input.key, input.storeId);
    this.cache.set(input.key, input.storeId, resolved);
    return ok({ key: input.key, type: definition.type, value: resolved.value, storeId: input.storeId, source: resolved.source });
  }

  private async resolve(key: SettingKey, storeId: string | null): Promise<CachedSetting> {
    if (storeId) {
      const override = await this.settings.findByKeyAndStore(key, storeId);
      if (override) {
        return { value: override.value, source: 'override' };
      }
    }

    const global = await this.settings.findByKeyAndStore(key, null);
    if (global) {
      return { value: global.value, source: 'global' };
    }

    return { value: SETTINGS_CATALOG[key].default, source: 'default' };
  }
}
