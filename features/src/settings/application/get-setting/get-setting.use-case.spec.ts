import { describe, expect, it } from 'vitest';
import { InMemorySettingRepository } from '../../infra/in-memory-setting.repository';
import { InMemorySettingsCache } from '../../infra/in-memory-settings-cache';
import { Setting } from '../../domain/setting.entity';
import { UnknownSettingKeyError } from '../../domain/errors';
import { GetSettingUseCase } from './get-setting.use-case';

describe('GetSettingUseCase', () => {
  it('devuelve el default del catálogo cuando no hay filas', async () => {
    const settings = new InMemorySettingRepository();
    const cache = new InMemorySettingsCache();
    const useCase = new GetSettingUseCase(settings, cache);

    const result = await useCase.execute({ key: 'checkout.allow_guest_checkout', storeId: 'store-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        key: 'checkout.allow_guest_checkout',
        type: 'boolean',
        value: true,
        storeId: 'store-1',
        source: 'default',
      });
    }
  });

  it('prefiere el override de tienda sobre el valor global', async () => {
    const settings = new InMemorySettingRepository();
    const cache = new InMemorySettingsCache();
    const useCase = new GetSettingUseCase(settings, cache);

    await settings.upsert(
      Setting.create({ key: 'store.display_name', storeId: null, value: 'Global Store' }),
      { userId: null, storeId: null, action: 'setting.updated', entityType: 'setting', entityId: 'global' },
    );
    await settings.upsert(
      Setting.create({ key: 'store.display_name', storeId: 'store-1', value: 'Tienda Uno' }),
      { userId: null, storeId: 'store-1', action: 'setting.updated', entityType: 'setting', entityId: 'override' },
    );

    const result = await useCase.execute({ key: 'store.display_name', storeId: 'store-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.value).toBe('Tienda Uno');
      expect(result.value.source).toBe('override');
    }
  });

  it('cae al valor global cuando no hay override de tienda', async () => {
    const settings = new InMemorySettingRepository();
    const cache = new InMemorySettingsCache();
    const useCase = new GetSettingUseCase(settings, cache);

    await settings.upsert(
      Setting.create({ key: 'store.display_name', storeId: null, value: 'Global Store' }),
      { userId: null, storeId: null, action: 'setting.updated', entityType: 'setting', entityId: 'global' },
    );

    const result = await useCase.execute({ key: 'store.display_name', storeId: 'store-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.value).toBe('Global Store');
      expect(result.value.source).toBe('global');
    }
  });

  it('rechaza claves desconocidas', async () => {
    const settings = new InMemorySettingRepository();
    const cache = new InMemorySettingsCache();
    const useCase = new GetSettingUseCase(settings, cache);

    const result = await useCase.execute({ key: 'no.existe', storeId: null });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(UnknownSettingKeyError);
    }
  });

  it('cachea el resultado para no volver a consultar el repo', async () => {
    const settings = new InMemorySettingRepository();
    const cache = new InMemorySettingsCache();
    const useCase = new GetSettingUseCase(settings, cache);

    await useCase.execute({ key: 'inventory.low_stock_threshold', storeId: null });

    settings.settings.clear();
    const result = await useCase.execute({ key: 'inventory.low_stock_threshold', storeId: null });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.value).toBe(5);
      expect(result.value.source).toBe('default');
    }
  });
});
