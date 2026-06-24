import { describe, expect, it } from 'vitest';
import { InMemorySettingRepository } from '../../infra/in-memory-setting.repository';
import { Setting } from '../../domain/setting.entity';
import { SETTINGS_CATALOG } from '../../domain/settings-catalog';
import { ListSettingsUseCase } from './list-settings.use-case';

describe('ListSettingsUseCase', () => {
  it('lista el catálogo completo con defaults cuando no hay filas', async () => {
    const settings = new InMemorySettingRepository();
    const useCase = new ListSettingsUseCase(settings);

    const result = await useCase.execute({ storeId: 'store-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(Object.keys(SETTINGS_CATALOG).length);
      const displayName = result.value.find((s) => s.key === 'store.display_name');
      expect(displayName).toEqual({
        key: 'store.display_name',
        type: 'string',
        value: '',
        storeId: 'store-1',
        source: 'default',
      });
    }
  });

  it('mezcla globales y overrides de tienda con la precedencia correcta', async () => {
    const settings = new InMemorySettingRepository();
    const useCase = new ListSettingsUseCase(settings);

    await settings.upsert(
      Setting.create({ key: 'store.display_name', storeId: null, value: 'Global Store' }),
      { userId: null, storeId: null, action: 'setting.updated', entityType: 'setting', entityId: 'global' },
    );
    await settings.upsert(
      Setting.create({ key: 'store.display_name', storeId: 'store-1', value: 'Tienda Uno' }),
      { userId: null, storeId: 'store-1', action: 'setting.updated', entityType: 'setting', entityId: 'override' },
    );
    await settings.upsert(
      Setting.create({ key: 'store.support_email', storeId: null, value: 'soporte@mitama.local' }),
      { userId: null, storeId: null, action: 'setting.updated', entityType: 'setting', entityId: 'global-email' },
    );

    const result = await useCase.execute({ storeId: 'store-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const displayName = result.value.find((s) => s.key === 'store.display_name');
      expect(displayName).toMatchObject({ value: 'Tienda Uno', source: 'override' });

      const supportEmail = result.value.find((s) => s.key === 'store.support_email');
      expect(supportEmail).toMatchObject({ value: 'soporte@mitama.local', source: 'global' });
    }
  });
});
