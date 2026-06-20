/**
 * Sprint 1 · Seed · Orquestador
 *
 * Carga los datos mínimos para arrancar el MVP del Sprint 1 (API + Admin):
 *   1. Datos de referencia (currencies, regions, countries, payment providers, tax rules).
 *   2. Roles predefinidos (Super Admin, Admin de tienda, Operador).
 *   3. Usuario Super Admin (`admin@mitama.local`).
 *   4. Tienda demo en MXN con métodos de pago, envío e impuestos listos.
 *
 * Idempotente por construcción: cada módulo usa `upsert` por clave natural,
 * así que ejecutar `yarn db:seed` varias veces no duplica datos.
 *
 * Cada paso vive en `prisma/seed/<dominio>.ts`. Aquí solo se orquesta el orden.
 */
import { PrismaClient } from '@prisma/client';
import { seedDemoStore, seedReferenceData, seedRoles, seedSuperAdminUser } from './seed/index';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await seedReferenceData(prisma);
  const { superAdminRoleId } = await seedRoles(prisma);
  await seedSuperAdminUser(prisma, superAdminRoleId);
  await seedDemoStore(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
