import { describe, expect, it } from 'vitest';
import { validateEnv } from './env';

const baseEnv = {
  DATABASE_URL: 'postgresql://mitama:mitama@localhost:5432/mitama',
  JWT_SECRET: 'x'.repeat(32),
  JWT_REFRESH_SECRET: 'y'.repeat(32),
};

describe('validateEnv', () => {
  it('permite SETTINGS_ENCRYPTION_KEY ausente fuera de producción', () => {
    expect(() => validateEnv({ ...baseEnv, NODE_ENV: 'test' })).not.toThrow();
  });

  it('falla en producción sin SETTINGS_ENCRYPTION_KEY', () => {
    expect(() => validateEnv({ ...baseEnv, NODE_ENV: 'production' })).toThrow(
      'Variables de entorno requeridas en producción ausentes: SETTINGS_ENCRYPTION_KEY',
    );
  });

  it('permite producción con SETTINGS_ENCRYPTION_KEY', () => {
    expect(() =>
      validateEnv({ ...baseEnv, NODE_ENV: 'production', SETTINGS_ENCRYPTION_KEY: 'secret-key' }),
    ).not.toThrow();
  });
});
