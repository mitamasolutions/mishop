import { createScopingExtension } from './scoping.extension';
import type { PrismaService } from './prisma.service';
import type { RequestContextService } from './request-context';

/** Token de inyección del cliente Prisma con scoping multi-tienda aplicado. */
export const SCOPED_PRISMA = 'mitama.scoped-prisma';

export function createScopedPrismaClient(prisma: PrismaService, context: RequestContextService) {
  return prisma.$extends(createScopingExtension(context));
}

/** Tipo del cliente Prisma con scoping: usarlo para los modelos Setting/UserStoreRole/ActivityLogEntry. */
export type ScopedPrismaClient = ReturnType<typeof createScopedPrismaClient>;
