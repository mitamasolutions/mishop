/**
 * Sprint 1 · Seed · Usuario Super Admin
 *
 * Cuenta semilla `admin@mitama.local` con contraseña tomada de
 * `SEED_ADMIN_PASSWORD` y asignación de rol Super Admin global
 * (`storeId IS NULL` en UserStoreRole).
 */
import type { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const SUPER_ADMIN_EMAIL = 'admin@mitama.local';
const SUPER_ADMIN_NAME = 'Super Admin';

export async function seedSuperAdminUser(prisma: PrismaClient, superAdminRoleId: string): Promise<void> {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    throw new Error('SEED_ADMIN_PASSWORD no está definida en el .env');
  }

  const user = await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    create: { email: SUPER_ADMIN_EMAIL, name: SUPER_ADMIN_NAME, status: 'active' },
    update: { name: SUPER_ADMIN_NAME, status: 'active' },
    include: { passwordCredentials: true },
  });

  if (user.passwordCredentials.length === 0) {
    const hash = await argon2.hash(password);
    await prisma.passwordCredential.create({ data: { userId: user.id, hash } });
  }

  const existingRole = await prisma.userStoreRole.findFirst({
    where: { userId: user.id, storeId: null, roleId: superAdminRoleId },
  });
  if (!existingRole) {
    await prisma.userStoreRole.create({ data: { userId: user.id, storeId: null, roleId: superAdminRoleId } });
  }
}
