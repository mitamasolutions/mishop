import type { Prisma } from '@mitama/data';

/**
 * Entrada para `recordActivity`. `storeId` puede ser `null` para acciones
 * globales (gestión de usuarios/roles fuera del contexto de una tienda).
 */
export interface RecordActivityInput {
  userId: string | null;
  storeId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  ip?: string | null;
  diff?: Prisma.InputJsonValue | null;
}

/**
 * Registra una entrada de actividad dentro de la misma transacción de la
 * mutación que la origina (regla: si falla el log, falla la mutación).
 */
export async function recordActivity(
  tx: Prisma.TransactionClient,
  entry: RecordActivityInput,
): Promise<void> {
  await tx.activityLogEntry.create({
    data: {
      userId: entry.userId,
      storeId: entry.storeId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      ip: entry.ip ?? null,
      diff: entry.diff ?? undefined,
    },
  });
}
