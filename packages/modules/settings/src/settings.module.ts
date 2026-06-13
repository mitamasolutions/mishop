/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Module } from '@nestjs/common';
import type { EventBus } from '@mitama/core';
import { EVENT_BUS } from '@mitama/contracts';
import { SETTINGS_TOKENS } from './settings.tokens';
import { GetSettingUseCase } from './application/get-setting/get-setting.use-case';
import { ListSettingsUseCase } from './application/list-settings/list-settings.use-case';
import { UpdateSettingUseCase } from './application/update-setting/update-setting.use-case';
import type { SettingRepository } from './domain/setting.repository';
import type { SettingsCache } from './domain/settings-cache';
import { PrismaSettingRepository } from './infra/prisma-setting.repository';
import { SettingsCacheService } from './infra/settings-cache.service';
import { SettingsController } from './http/settings.controller';

@Module({
  controllers: [SettingsController],
  providers: [
    { provide: SETTINGS_TOKENS.settingRepository, useClass: PrismaSettingRepository },
    { provide: SETTINGS_TOKENS.settingsCache, useClass: SettingsCacheService },
    {
      provide: GetSettingUseCase,
      useFactory: (settings: SettingRepository, cache: SettingsCache) => new GetSettingUseCase(settings, cache),
      inject: [SETTINGS_TOKENS.settingRepository, SETTINGS_TOKENS.settingsCache],
    },
    {
      provide: ListSettingsUseCase,
      useFactory: (settings: SettingRepository) => new ListSettingsUseCase(settings),
      inject: [SETTINGS_TOKENS.settingRepository],
    },
    {
      provide: UpdateSettingUseCase,
      useFactory: (settings: SettingRepository, eventBus: EventBus) => new UpdateSettingUseCase(settings, eventBus),
      inject: [SETTINGS_TOKENS.settingRepository, EVENT_BUS],
    },
  ],
})
export class SettingsModule {}
