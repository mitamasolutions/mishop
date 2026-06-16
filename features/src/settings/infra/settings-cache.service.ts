import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { EVENT_BUS, SETTINGS_UPDATED, type SettingsUpdatedEvent } from '@mitama/contracts';
import type { EventBus } from '@mitama/core';
import { InMemorySettingsCache } from './in-memory-settings-cache';

/** Cache de settings que se invalida al recibir `settings.updated` del bus de eventos. */
@Injectable()
export class SettingsCacheService extends InMemorySettingsCache implements OnModuleInit {
  constructor(@Inject(EVENT_BUS) private readonly eventBus: EventBus) {
    super();
  }

  onModuleInit(): void {
    this.eventBus.subscribe<SettingsUpdatedEvent>(SETTINGS_UPDATED, (event) => {
      this.invalidateKey(event.payload.key);
    });
  }
}
