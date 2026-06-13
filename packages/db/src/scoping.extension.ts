import { Prisma } from '@prisma/client';
import type { RequestContextService } from './request-context';

/** Modelos con columna `store_id`, sujetos al scoping multi-tienda fail-closed. */
const SCOPED_MODELS = new Set(['Setting', 'UserStoreRole', 'ActivityLogEntry']);

/** Operaciones cuyo `where` se puede combinar con un filtro adicional por storeId. */
const FILTER_OPERATIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

/**
 * findUnique/update/delete operan por `where` único (p.ej. `id`), que no
 * admite combinarse con un filtro extra sin romper la validación de Prisma.
 * Sobre modelos scoped, los repos deben usar findFirst/updateMany/deleteMany
 * con `storeId` explícito en el `where` en su lugar.
 */
const UNSUPPORTED_SINGLE_RECORD_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'update',
  'delete',
]);

export class MissingStoreContextError extends Error {
  constructor(model: string) {
    super(
      `Operación sobre "${model}" sin tienda activa en el contexto de la petición (fail-closed).`,
    );
    this.name = 'MissingStoreContextError';
  }
}

export class UnsupportedScopedOperationError extends Error {
  constructor(model: string, operation: string) {
    super(
      `"${operation}" no está soportado sobre el modelo scoped "${model}". ` +
        'Usa findFirst/findMany/updateMany/deleteMany/upsert con storeId explícito en el where.',
    );
    this.name = 'UnsupportedScopedOperationError';
  }
}

/**
 * Extensión de Prisma Client: aplica el scoping multi-tienda fail-closed
 * (regla 14 de arquitectura). Toda operación sobre un modelo scoped exige
 * `storeId` en el RequestContextService (salvo Super Admin) e inyecta el
 * filtro/valor automáticamente.
 */
export function createScopingExtension(context: RequestContextService) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: 'store-scoping',
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (!SCOPED_MODELS.has(model)) {
              return query(args);
            }

            const ctx = context.get();
            if (!ctx) {
              throw new MissingStoreContextError(model);
            }
            if (ctx.isSuperAdmin) {
              return query(args);
            }
            if (!ctx.storeId) {
              throw new MissingStoreContextError(model);
            }
            const { storeId } = ctx;

            if (FILTER_OPERATIONS.has(operation)) {
              const typedArgs = args as { where?: object };
              typedArgs.where = typedArgs.where
                ? { AND: [typedArgs.where, { storeId }] }
                : { storeId };
              return query(args);
            }

            if (operation === 'create') {
              const typedArgs = args as { data: Record<string, unknown> };
              typedArgs.data = { ...typedArgs.data, storeId };
              return query(args);
            }

            if (operation === 'createMany') {
              const typedArgs = args as { data: Record<string, unknown>[] };
              typedArgs.data = typedArgs.data.map((item) => ({ ...item, storeId }));
              return query(args);
            }

            if (operation === 'upsert') {
              const typedArgs = args as { create: Record<string, unknown> };
              typedArgs.create = { ...typedArgs.create, storeId };
              return query(args);
            }

            if (UNSUPPORTED_SINGLE_RECORD_OPERATIONS.has(operation)) {
              throw new UnsupportedScopedOperationError(model, operation);
            }

            return query(args);
          },
        },
      },
    }),
  );
}
