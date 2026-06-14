import 'reflect-metadata';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AllowAuthenticated,
  NoStoreScope,
  RequirePermission,
  type AuthenticatedUser,
} from '@mitama/contracts';
import { describe, expect, it } from 'vitest';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  it('rechaza rutas autenticadas sin permiso declarado', () => {
    const guard = new PermissionsGuard(new Reflector());
    const context = contextFor({ handler: undecoratedHandler, request: { user: userWith('products.read') } });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('permite rutas self-service con AllowAuthenticated', () => {
    const guard = new PermissionsGuard(new Reflector());
    const context = contextFor({ handler: allowAuthenticatedHandler, request: { user: userWith() } });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('permite rutas NoStoreScope si el usuario tiene el permiso en cualquier tienda', () => {
    const guard = new PermissionsGuard(new Reflector());
    const context = contextFor({
      handler: noStoreScopeHandler,
      request: { user: userWith('stores.read') },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('exige el permiso en la tienda activa para rutas scoped', () => {
    const guard = new PermissionsGuard(new Reflector());
    const user = userWith('orders.read');

    expect(
      guard.canActivate(
        contextFor({
          handler: scopedHandler,
          request: { user, headers: { 'x-store-id': 'store-1' } },
        }),
      ),
    ).toBe(true);

    expect(() =>
      guard.canActivate(
        contextFor({
          handler: scopedHandler,
          request: { user, headers: { 'x-store-id': 'store-2' } },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('usa la única tienda con permiso cuando falta X-Store-Id', () => {
    const guard = new PermissionsGuard(new Reflector());
    const request = { user: userWith('orders.read'), headers: {} };

    expect(guard.canActivate(contextFor({ handler: scopedHandler, request }))).toBe(true);
    expect(request.headers['x-store-id']).toBe('store-1');
  });
});

function undecoratedHandler(): void {}

function allowAuthenticatedHandler(): void {}
AllowAuthenticated()(allowAuthenticatedHandler);

function noStoreScopeHandler(): void {}
RequirePermission('stores.read')(noStoreScopeHandler);
NoStoreScope()(noStoreScopeHandler);

function scopedHandler(): void {}
RequirePermission('orders.read')(scopedHandler);

function userWith(...permissions: AuthenticatedUser['storeRoles'][number]['permissions']): AuthenticatedUser {
  return {
    id: 'user-1',
    email: 'user@mitama.local',
    isSuperAdmin: false,
    storeRoles: [{ storeId: 'store-1', roleId: 'role-1', permissions }],
  };
}

function contextFor(input: {
  handler: () => void;
  request: { user?: AuthenticatedUser; headers?: Record<string, string | undefined> };
}): ExecutionContext {
  return {
    getType: () => 'http',
    getHandler: () => input.handler,
    getClass: () => TestController,
    switchToHttp: () => ({
      getRequest: () => ({ headers: input.request.headers ?? {}, user: input.request.user }),
    }),
  } as ExecutionContext;
}

class TestController {}
