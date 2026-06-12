/**
 * Seed de desarrollo. Hoy está vacío a propósito: cada módulo agregará
 * sus datos de ejemplo cuando tenga lógica de negocio real.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // TODO: datos de ejemplo por módulo (tiendas, usuarios, catálogo...).
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
