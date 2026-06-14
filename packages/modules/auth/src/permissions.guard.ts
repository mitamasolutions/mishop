import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ALLOW_AUTHENTICATED_KEY,
  IS_PUBLIC_KEY,
  NO_STORE_SCOPE_KEY,
  REQUIRE_PERMISSION_KEY,
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
    const storeRole = user.storeRoles.find((role) => role.storeId === storeId);
    if (!storeRole || !storeRole.permissions.includes(permission)) {
      throw new ForbiddenException('No tienes permiso para realizar esta acción');
    }

    return true;
  }
}
