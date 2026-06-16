/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Module } from '@nestjs/common';
import { createModuleProviders, EVENT_BUS } from '@mitama/contracts';
import { SETTINGS_TOKENS } from './settings.tokens';
import { GetSettingUseCase } from './application/get-setting/get-setting.use-case';
import { ListSettingsUseCase } from './application/list-settings/list-settings.use-case';
import { UpdateSettingUseCase } from './application/update-setting/update-setting.use-case';
import { PrismaSettingRepository } from './infra/prisma-setting.repository';
import { SettingsCacheService } from './infra/settings-cache.service';
import { SettingsController } from './http/settings.controller';

@Module({
  controllers: [SettingsController],
  providers: createModuleProviders([
    { provide: SETTINGS_TOKENS.settingRepository, useClass: PrismaSettingRepository },
    { provide: SETTINGS_TOKENS.settingsCache, useClass: SettingsCacheService },
    { useCase: GetSettingUseCase, inject: [SETTINGS_TOKENS.settingRepository, SETTINGS_TOKENS.settingsCache] },
    { useCase: ListSettingsUseCase, inject: [SETTINGS_TOKENS.settingRepository] },
    { useCase: UpdateSettingUseCase, inject: [SETTINGS_TOKENS.settingRepository, EVENT_BUS] },
  ]),
})
export class SettingsModule {}
