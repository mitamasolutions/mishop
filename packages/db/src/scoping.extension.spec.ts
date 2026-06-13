import { describe, expect, it, vi } from 'vitest';
import {
  createScopingExtension,
  MissingStoreContextError,
  UnsupportedScopedOperationError,
} from './scoping.extension';
import { RequestContextService } from './request-context';

type AllOperations = (params: {
  model: string;
  operation: string;
  args: Record<string, unknown>;
  query: (args: unknown) => Promise<unknown>;
}) => Promise<unknown>;

/**
 * La extensión se construye con `Prisma.defineExtension`, que devuelve una
 * función `(client) => client.$extends({...})`. Para testear la lógica de
 * `$allOperations` sin un PrismaClient real, se le pasa un cliente falso
 * cuyo `$extends` simplemente devuelve la configuración recibida.
 */
function getAllOperations(context: RequestContextService): AllOperations {
  const extensionFn = createScopingExtension(context) as unknown as (client: unknown) => unknown;
  const fakeClient = { $extends: (config: unknown) => config };
  const config = extensionFn(fakeClient) as {
    query: { $allModels: { $allOperations: AllOperations } };
  };
  return config.query.$allModels.$allOperations;
}

describe('createScopingExtension', () => {
  it('falla cerrado si no hay contexto de petición', async () => {
    const context = new RequestContextService();
    const allOperations = getAllOperations(context);
    const query = vi.fn();

    await expect(
      allOperations({ model: 'Setting', operation: 'findMany', args: {}, query }),
    ).rejects.toThrow(MissingStoreContextError);
    expect(query).not.toHaveBeenCalled();
  });

  it('falla cerrado si hay contexto pero sin storeId y el usuario no es Super Admin', async () => {
    const context = new RequestContextService();
    const allOperations = getAllOperations(context);
    const query = vi.fn();

    await context.run({ userId: 'user-1', storeId: null, isSuperAdmin: false }, async () => {
      await expect(
        allOperations({ model: 'Setting', operation: 'findMany', args: {}, query }),
      ).rejects.toThrow(MissingStoreContextError);
    });
    expect(query).not.toHaveBeenCalled();
  });

  it('Super Admin sin storeId puede operar sobre modelos scoped sin filtro adicional', async () => {
    const context = new RequestContextService();
    const allOperations = getAllOperations(context);
    const query = vi.fn().mockResolvedValue('ok');

    await context.run({ userId: 'user-1', storeId: null, isSuperAdmin: true }, async () => {
      const result = await allOperations({
        model: 'Setting',
        operation: 'findMany',
        args: { where: { key: 'x' } },
        query,
      });
      expect(result).toBe('ok');
    });
    expect(query).toHaveBeenCalledWith({ where: { key: 'x' } });
  });

  it('inyecta el storeId del contexto en el where de findMany', async () => {
    const context = new RequestContextService();
    const allOperations = getAllOperations(context);
    const query = vi.fn().mockResolvedValue([]);

    await context.run({ userId: 'user-1', storeId: 'store-a', isSuperAdmin: false }, async () => {
      await allOperations({
        model: 'Setting',
        operation: 'findMany',
        args: { where: { key: 'x' } },
        query,
      });
    });

    expect(query).toHaveBeenCalledWith({ where: { AND: [{ key: 'x' }, { storeId: 'store-a' }] } });
  });

  it('inyecta el storeId en data al crear un registro scoped', async () => {
    const context = new RequestContextService();
    const allOperations = getAllOperations(context);
    const query = vi.fn().mockResolvedValue({});

    await context.run({ userId: 'user-1', storeId: 'store-a', isSuperAdmin: false }, async () => {
      await allOperations({
        model: 'ActivityLogEntry',
        operation: 'create',
        args: { data: { action: 'auth.login' } },
        query,
      });
    });

    expect(query).toHaveBeenCalledWith({ data: { action: 'auth.login', storeId: 'store-a' } });
  });

  it('rechaza findUnique/update/delete sobre modelos scoped', async () => {
    const context = new RequestContextService();
    const allOperations = getAllOperations(context);
    const query = vi.fn();

    await context.run({ userId: 'user-1', storeId: 'store-a', isSuperAdmin: false }, async () => {
      await expect(
        allOperations({ model: 'Setting', operation: 'findUnique', args: { where: { id: '1' } }, query }),
      ).rejects.toThrow(UnsupportedScopedOperationError);
    });
    expect(query).not.toHaveBeenCalled();
  });

  it('no aplica scoping a modelos no listados como scoped', async () => {
    const context = new RequestContextService();
    const allOperations = getAllOperations(context);
    const query = vi.fn().mockResolvedValue('ok');

    const result = await allOperations({
      model: 'Store',
      operation: 'findUnique',
      args: { where: { id: 'store-a' } },
      query,
    });

    expect(result).toBe('ok');
    expect(query).toHaveBeenCalledWith({ where: { id: 'store-a' } });
  });
});
