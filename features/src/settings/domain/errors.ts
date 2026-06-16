import { DomainError } from '@mitama/core';
import type { SettingType } from './settings-catalog';

export class UnknownSettingKeyError extends DomainError {
  readonly code = 'SETTINGS.UNKNOWN_KEY';

  constructor(key: string) {
    super(`"${key}" no es una clave de configuración válida`);
  }
}

export class InvalidSettingValueError extends DomainError {
  readonly code = 'SETTINGS.INVALID_VALUE';

  constructor(key: string, type: SettingType) {
    super(`El valor de "${key}" debe ser de tipo ${type}`);
  }
}
