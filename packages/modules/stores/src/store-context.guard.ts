import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  IS_PUBLIC_KEY,
  NO_STORE_SCOPE_KEY,
  type ActiveStore,
  type AuthenticatedUser,
} from '@mitama/contracts';
import { STORES_TOKENS } from './stores.tokens';
import type { StoreRepository } from './domain/store.repository';

interface StoreContextRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
  store?: ActiveStore;
}

/**
 * Lee `X-Store-Id` o resuelve una tienda por defecto para instalaciones
 * single-store. Valida que el usuario tenga rol en esa tienda (o sea Super
 * Admin) y que la tienda exista y esté activa. Rutas `@Public()` o
 * `@NoStoreScope()` se omiten.
 */
@Injectable()
export class StoreContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(STORES_TOKENS.storeRepository) private readonly stores: StoreRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const noStoreScope = this.reflector.getAllAndOverride<boolean>(NO_STORE_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic || noStoreScope) {
      return true;
    }

    const request = context.switchToHttp().getRequest<StoreContextRequest>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('No autenticado');
    }

    const storeId = await this.resolveStoreId(request, user);
    if (!storeId) {
      throw new BadRequestException('Falta el encabezado X-Store-Id');
    }

    if (!user.isSuperAdmin && !user.storeRoles.some((role) => role.storeId === storeId)) {
      throw new ForbiddenException('No tienes acceso a esta tienda');
    }

    const store = await this.stores.findById(storeId);
    if (!store || !store.isActive) {
      throw new NotFoundException('La tienda no existe o está inactiva');
    }

    request.store = { id: store.id, code: store.code, name: store.name };
    return true;
  }

  private async resolveStoreId(request: StoreContextRequest, user: AuthenticatedUser): Promise<string | undefined> {
    const header = request.headers['x-store-id'];
    const headerStoreId = Array.isArray(header) ? header[0] : header;
    if (headerStoreId) {
      return headerStoreId;
    }

    const configuredDefault = process.env.DEFAULT_STORE_ID;
    if (configuredDefault && (user.isSuperAdmin || user.storeRoles.some((role) => role.storeId === configuredDefault))) {
      return configuredDefault;
    }

    if (!user.isSuperAdmin && user.storeRoles.length === 1) {
      return user.storeRoles[0]?.storeId;
    }

    const activeStores = (await this.stores.findAll()).filter((store) => store.isActive);
    if (activeStores.length === 1) {
      const [store] = activeStores;
      if (store && (user.isSuperAdmin || user.storeRoles.some((role) => role.storeId === store.id))) {
        return store.id;
      }
    }

    return undefined;
  }
}
