import type { DomainEvent } from '@mitama/core';

export const SETTINGS_UPDATED = 'settings.updated';

export interface SettingsUpdatedPayload {
  key: string;
  storeId: string | null;
}

/** Publicado al escribir un setting; invalida la cache en memoria del módulo settings. */
export class SettingsUpdatedEvent implements DomainEvent<SettingsUpdatedPayload> {
  readonly name = SETTINGS_UPDATED;
  readonly occurredAt = new Date();

  constructor(readonly payload: SettingsUpdatedPayload) {}
}
