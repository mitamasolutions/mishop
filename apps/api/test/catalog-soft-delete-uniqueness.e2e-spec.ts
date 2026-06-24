import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '@mitama/data';
import { AppModule } from '../src/app.module';

/**
 * Regresión r20 (F0 · sprint1_cierre): la unicidad de `Product.handle` y
 * `ProductVariant.sku` debe ser **parcial sobre filas activas**
 * (`deleted_at IS NULL`). Tras un soft-delete, se permite reutilizar el
 * handle/SKU; pero dos filas activas con el mismo valor deben fallar.
 */
describe('Catalog uniqueness con soft-delete (e2e · r20)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = randomUUID().slice(0, 8);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('permite reutilizar Product.handle tras un soft-delete', async () => {
    const handle = `r20-handle-${suffix}`;

    const first = await prisma.product.create({
      data: { title: 'Original', handle },
    });

    // Soft-delete: marcar deleted_at libera el handle por el índice parcial.
    await prisma.product.update({ where: { id: first.id }, data: { deletedAt: new Date() } });

    // Reutilizar el handle en una fila nueva debe funcionar.
    const second = await prisma.product.create({
      data: { title: 'Reutilizado', handle },
    });

    expect(second.id).not.toBe(first.id);
    expect(second.handle).toBe(handle);

    // Pero un tercer producto activo con el mismo handle debe fallar.
    await expect(
      prisma.product.create({ data: { title: 'Colisión', handle } }),
    ).rejects.toThrow();

    // Limpieza
    await prisma.product.deleteMany({ where: { handle } });
  });

  it('permite reutilizar ProductVariant.sku tras un soft-delete', async () => {
    const handle = `r20-sku-prod-${suffix}`;
    const sku = `R20-SKU-${suffix}`;

    const product = await prisma.product.create({
      data: { title: 'Producto SKU', handle },
    });

    const v1 = await prisma.productVariant.create({
      data: { productId: product.id, title: 'V1', sku },
    });

    await prisma.productVariant.update({ where: { id: v1.id }, data: { deletedAt: new Date() } });

    const v2 = await prisma.productVariant.create({
      data: { productId: product.id, title: 'V2', sku },
    });

    expect(v2.id).not.toBe(v1.id);

    // Tercera variante activa con el mismo SKU debe fallar.
    await expect(
      prisma.productVariant.create({ data: { productId: product.id, title: 'V3', sku } }),
    ).rejects.toThrow();

    // Limpieza (cascade desde Product)
    await prisma.product.delete({ where: { id: product.id } });
  });
});
