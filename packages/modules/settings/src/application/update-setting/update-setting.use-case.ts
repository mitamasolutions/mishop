import { err, ok, type EventBus, type Result, type UseCase } from '@mitama/core';
import { SettingsUpdatedEvent } from '@mitama/contracts';
import { isSettingKey, matchesSettingType, SETTINGS_CATALOG } from '../../domain/settings-catalog';
import { InvalidSettingValueError, UnknownSettingKeyError } from '../../domain/errors';
import { Setting } from '../../domain/setting.entity';
import type { SettingRepository } from '../../domain/setting.repository';
import type { UpdateSettingInput } from './update-setting.dto';

export type UpdateSettingError = UnknownSettingKeyError | InvalidSettingValueError;

/** Crea o actualiza el valor de una clave (override de tienda o global) y notifica vía evento. */
export class UpdateSettingUseCase implements UseCase<UpdateSettingInput, Result<void, UpdateSettingError>> {
  constructor(
    private readonly settings: SettingRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: UpdateSettingInput): Promise<Result<void, UpdateSettingError>> {
    if (!isSettingKey(input.key)) {
      return err(new UnknownSettingKeyError(input.key));
    }

    const definition = SETTINGS_CATALOG[input.key];
    if (!matchesSettingType(definition.type, input.value)) {
      return err(new InvalidSettingValueError(input.key, definition.type));
    }

    const now = new Date();
    const existing = await this.settings.findByKeyAndStore(input.key, input.storeId);
    const setting = existing ?? Setting.create({ key: input.key, storeId: input.storeId, value: input.value });
    if (existing) {
      existing.updateValue(input.value, now);
    }

    await this.settings.upsert(setting, {
      userId: input.actorUserId || null,
      storeId: input.storeId,
      action: 'setting.updated',
      entityType: 'setting',
      entityId: setting.id,
    });

    await this.eventBus.publish(new SettingsUpdatedEvent({ key: input.key, storeId: input.storeId }));
    return ok(undefined);
  }
}
