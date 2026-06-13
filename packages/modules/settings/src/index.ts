/**
 * API pública del módulo settings. Otros paquetes SOLO pueden importar de aquí
 * (regla 3 de arquitectura). Los eventos compartidos viven en @mitama/contracts.
 */
export { SettingsModule } from './settings.module';
export { SETTINGS_TOKENS } from './settings.tokens';
export { SETTINGS_CATALOG, isSettingKey, matchesSettingType } from './domain/settings-catalog';
export type { SettingKey, SettingType, SettingValue, SettingDefinition } from './domain/settings-catalog';
export type { SettingRepository } from './domain/setting.repository';
