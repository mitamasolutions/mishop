import { describe, expect, it } from 'vitest';
import { InMemoryEventBus } from '@mitama/core';
import { SETTINGS_UPDATED, type SettingsUpdatedEvent } from '@mitama/contracts';
import { InMemorySettingRepository } from '../../infra/in-memory-setting.repository';
import { InMemorySettingsCache } from '../../infra/in-memory-settings-cache';
import { InvalidSettingValueError, UnknownSettingKeyError } from '../../domain/errors';
import { GetSettingUseCase } from '../get-setting/get-setting.use-case';
import { UpdateSettingUseCase } from './update-setting.use-case';

describe('UpdateSettingUseCase', () => {
  it('crea el valor, registra actividad y emite settings.updated', async () => {
    const settings = new InMemorySettingRepository();
    const eventBus = new InMemoryEventBus();
    const useCase = new UpdateSettingUseCase(settings, eventBus);

    const events: SettingsUpdatedEvent[] = [];
    eventBus.subscribe<SettingsUpdatedEvent>(SETTINGS_UPDATED, (event) => {
      events.push(event);
    });

    const result = await useCase.execute({
      actorUserId: 'user-1',
      key: 'store.display_name',
      storeId: 'store-1',
      value: 'Tienda Uno',
    });

    expect(result.isOk()).toBe(true);
    expect(events).toEqual([expect.objectContaining({ payload: { key: 'store.display_name', storeId: 'store-1' } })]);

    const stored = await settings.findByKeyAndStore('store.display_name', 'store-1');
    expect(stored?.value).toBe('Tienda Uno');
  });

  it('invalida la cache de GetSetting al actualizar', async () => {
    const settings = new InMemorySettingRepository();
    const cache = new InMemorySettingsCache();
    const eventBus = new InMemoryEventBus();
    eventBus.subscribe<SettingsUpdatedEvent>(SETTINGS_UPDATED, (event) => cache.invalidateKey(event.payload.key));

    const getSetting = new GetSettingUseCase(settings, cache);
    const updateSetting = new UpdateSettingUseCase(settings, eventBus);

    const before = await getSetting.execute({ key: 'inventory.low_stock_threshold', storeId: 'store-1' });
    expect(before.isOk() && before.value.value).toBe(5);

    await updateSetting.execute({
      actorUserId: 'user-1',
      key: 'inventory.low_stock_threshold',
      storeId: 'store-1',
      value: 10,
    });

    const after = await getSetting.execute({ key: 'inventory.low_stock_threshold', storeId: 'store-1' });
    expect(after.isOk() && after.value.value).toBe(10);
    expect(after.isOk() && after.value.source).toBe('override');
  });

  it('rechaza claves desconocidas', async () => {
    const settings = new InMemorySettingRepository();
    const eventBus = new InMemoryEventBus();
    const useCase = new UpdateSettingUseCase(settings, eventBus);

    const result = await useCase.execute({ actorUserId: 'user-1', key: 'no.existe', storeId: null, value: 'x' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(UnknownSettingKeyError);
    }
  });

  it('rechaza valores de tipo incorrecto', async () => {
    const settings = new InMemorySettingRepository();
    const eventBus = new InMemoryEventBus();
    const useCase = new UpdateSettingUseCase(settings, eventBus);

    const result = await useCase.execute({
      actorUserId: 'user-1',
      key: 'checkout.allow_guest_checkout',
      storeId: null,
      value: 'no-es-booleano',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidSettingValueError);
    }
  });
});
