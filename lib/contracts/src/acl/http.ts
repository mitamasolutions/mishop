import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Permission } from './permissions';

/**
 * Metadata y tipos compartidos entre módulos para los guards globales
 * (`@mitama/auth`, `@mitama/stores`), registrados en `apps/api`. Viven en
 * `@mitama/contracts` para que ningún módulo dependa de los internals de
 * otro (regla 3): los guards los implementan, los controllers de cualquier
 * módulo los usan.
 */

export const IS_PUBLIC_KEY = 'mitama:is-public';
/** La ruta no requiere access token (login, refresh, reference-data, etc). */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

export const ALLOW_AUTHENTICATED_KEY = 'mitama:allow-authenticated';
/** La ruta solo requiere una sesión válida, sin permiso granular. */
export const AllowAuthenticated = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ALLOW_AUTHENTICATED_KEY, true);

export const NO_STORE_SCOPE_KEY = 'mitama:no-store-scope';
/** La ruta no requiere `X-Store-Id` (gestión global de usuarios/roles/tiendas). */
export const NoStoreScope = (): MethodDecorator & ClassDecorator =>
  SetMetadata(NO_STORE_SCOPE_KEY, true);

export const REQUIRE_PERMISSION_KEY = 'mitama:require-permission';
/** La ruta exige el permiso indicado en la tienda activa (o Super Admin). */
export const RequirePermission = (permission: Permission): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permission);

export const REQUIRE_SUPER_ADMIN_KEY = 'mitama:require-super-admin';
/**
 * La ruta exige `isSuperAdmin=true`. Pensada para tareas globales que
 * cruzan tiendas (gestión de scheduler, plataforma, etc).
 */
export const RequireSuperAdmin = (): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRE_SUPER_ADMIN_KEY, true);

/** Permisos efectivos de un usuario en una tienda (rol predefinido o personalizado). */
export interface AuthenticatedStoreRole {
  storeId: string;
  roleId: string;
  permissions: Permission[];
}

/** Forma de `request.user`, poblada por el `JwtAuthGuard` de `@mitama/auth`. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  isSuperAdmin: boolean;
  storeRoles: AuthenticatedStoreRole[];
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    return request.user;
  },
);

/** Forma de `request.store`, poblada por el `StoreContextGuard` de `@mitama/stores`. */
export interface ActiveStore {
  id: string;
  code: string;
  name: string;
}

export const CurrentStore = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ActiveStore | undefined => {
    const request = ctx.switchToHttp().getRequest<{ store?: ActiveStore }>();
    return request.store;
  },
);
