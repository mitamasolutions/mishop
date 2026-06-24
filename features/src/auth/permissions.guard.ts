import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ALLOW_AUTHENTICATED_KEY,
  IS_PUBLIC_KEY,
  NO_STORE_SCOPE_KEY,
  REQUIRE_PERMISSION_KEY,
  REQUIRE_SUPER_ADMIN_KEY,
  type AuthenticatedUser,
  type Permission,
} from '@mitama/contracts';

interface PermissionsRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
}

/**
 * Exige permisos de forma fail-closed: toda ruta no pública debe declarar
 * `@RequirePermission()` o `@AllowAuthenticated()` explícitamente.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const allowAuthenticated = this.reflector.getAllAndOverride<boolean>(ALLOW_AUTHENTICATED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<PermissionsRequest>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('No autenticado');
    }

    if (allowAuthenticated) {
      return true;
    }

    const requireSuperAdmin = this.reflector.getAllAndOverride<boolean>(REQUIRE_SUPER_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requireSuperAdmin) {
      if (user.isSuperAdmin) return true;
      throw new ForbiddenException('Solo Super Admin puede acceder a esta ruta');
    }

    const permission = this.reflector.getAllAndOverride<Permission | undefined>(REQUIRE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permission) {
      throw new ForbiddenException('La ruta no declara un permiso requerido');
    }

    if (user.isSuperAdmin) {
      return true;
    }

    const noStoreScope = this.reflector.getAllAndOverride<boolean>(NO_STORE_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (noStoreScope) {
      if (user.storeRoles.some((role) => role.permissions.includes(permission))) {
        return true;
      }
      throw new ForbiddenException('No tienes permiso para realizar esta acción');
    }

    const header = request.headers['x-store-id'];
    const storeId = Array.isArray(header) ? header[0] : header;
    const matchingRoles = user.storeRoles.filter((role) => role.permissions.includes(permission));
    const storeRole = storeId
      ? matchingRoles.find((role) => role.storeId === storeId)
      : matchingRoles.length === 1
        ? matchingRoles[0]
        : undefined;
    if (!storeRole) {
      throw new ForbiddenException('No tienes permiso para realizar esta acción');
    }

    if (!storeId) {
      request.headers['x-store-id'] = storeRole.storeId;
    }

    return true;
  }
}
