/**
 * Catálogo fijo de permisos (recurso.acción). Es la única fuente de verdad:
 * los roles personalizados solo pueden seleccionar permisos de esta lista
 * (regla "los permisos solo existen en el catálogo en código").
 */
export const PERMISSIONS = [
  'users.read',
  'users.create',
  'users.update',
  'users.delete',
  'users.invite',
  'roles.read',
  'roles.create',
  'roles.update',
  'roles.delete',
  'stores.read',
  'stores.create',
  'stores.update',
  'stores.delete',
  'settings.read',
  'settings.update',
  'activity-log.read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}
