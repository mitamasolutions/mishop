/**
 * Validación mínima de variables de entorno críticas para el bootstrap.
 * Se ejecuta una sola vez (via `ConfigModule.forRoot({ validate })`) y
 * lanza si falta alguna requerida o tiene formato inválido.
 *
 * Mantenido sin dependencias externas (joi/zod) para conservar el
 * bundle pequeño; si crecemos, migrar a `zod` y reusar el schema en
 * tooling.
 */
const REQUIRED = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;
const OPTIONAL_BOOLEAN = ['API_DOCS_ENABLED'];

export function validateEnv(input: Record<string, unknown>): Record<string, unknown> {
  const missing = REQUIRED.filter((key) => typeof input[key] !== 'string' || (input[key] as string).length === 0);
  if (missing.length > 0) {
    throw new Error(`Variables de entorno requeridas ausentes: ${missing.join(', ')}`);
  }
  for (const key of OPTIONAL_BOOLEAN) {
    const value = input[key];
    if (value === undefined || value === '') continue;
    if (!['true', 'false', '0', '1'].includes(String(value))) {
      throw new Error(`Variable ${key} debe ser booleana ('true'|'false'); recibido: ${String(value)}`);
    }
  }
  if (input.NODE_ENV === 'production') {
    if ((input.JWT_SECRET as string).length < 32) {
      throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
    }
    if ((input.JWT_REFRESH_SECRET as string).length < 32) {
      throw new Error('JWT_REFRESH_SECRET debe tener al menos 32 caracteres en producción');
    }
  }
  return input;
}

export function isTruthyEnv(value: string | undefined): boolean {
  if (!value) return false;
  return value === 'true' || value === '1';
}

export function parseCorsOrigins(value: string | undefined): string[] | true {
  if (!value || value.trim() === '') return true; // Backward compat: si no se define, todos.
  if (value === '*') return true;
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
