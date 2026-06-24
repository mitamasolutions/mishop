/**
 * Sprint 1 · Seed · Roles predefinidos
 *
 * Crea los 3 roles base de la plataforma: Super Admin (sistema, todos los
 * permisos), Admin de tienda (todos los permisos, no sistema) y Operador
 * (subconjunto de lectura). Devuelve el id del rol Super Admin para que
 * `super-admin.ts` pueda asignarlo a la cuenta semilla.
 */
import type { PrismaClient } from '@prisma/client';
import { PERMISSIONS, type Permission } from '@mitama/contracts';

const STORE_ADMIN_PERMISSIONS: Permission[] = [...PERMISSIONS];

const OPERATOR_PERMISSIONS: Permission[] = ['stores.read', 'settings.read', 'activity-log.read', 'users.read'];

export async function seedRoles(prisma: PrismaClient): Promise<{ superAdminRoleId: string }> {
  const superAdmin = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    create: { name: 'Super Admin', isSystem: true, permissions: [...PERMISSIONS] },
    update: { permissions: [...PERMISSIONS], isSystem: true },
  });

  await prisma.role.upsert({
    where: { name: 'Admin de tienda' },
    create: { name: 'Admin de tienda', isSystem: false, permissions: STORE_ADMIN_PERMISSIONS },
    update: { permissions: STORE_ADMIN_PERMISSIONS },
  });

  await prisma.role.upsert({
    where: { name: 'Operador' },
    create: { name: 'Operador', isSystem: false, permissions: OPERATOR_PERMISSIONS },
    update: { permissions: OPERATOR_PERMISSIONS },
  });

  return { superAdminRoleId: superAdmin.id };
}
