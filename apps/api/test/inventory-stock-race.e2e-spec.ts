import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '@mitama/db';
import { ORDERS_TOKENS, type StockReservationService } from '@mitama/features';
import { AppModule } from '../src/app.module';

/**
 * Prueba el lock optimista (`inventory_levels.version`) bajo concurrencia
 * real: con stock=1 y N reservas simultáneas para la misma variante/ubicación,
 * exactamente una debe ganar.
 */
describe('Carrera de inventario - lock optimista (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let stock: StockReservationService;
  const suffix = randomUUID().slice(0, 8);

  let product: { id: string };
  let variant: { id: string };
  let location: { id: string };
  let inventoryItem: { id: string };
  let store: { id: string };
  let customer: { id: string };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = moduleRef.get(PrismaService);
    stock = moduleRef.get(ORDERS_TOKENS.stockReservationService);

    product = await prisma.product.create({
      data: { title: `E2E Race Product ${suffix}`, handle: `e2e-race-product-${suffix}` },
    });
    variant = await prisma.productVariant.create({
      data: { title: 'Default', sku: `e2e-race-sku-${suffix}`, productId: product.id },
    });
    location = await prisma.stockLocation.create({ data: { name: `E2E Race Location ${suffix}` } });
    inventoryItem = await prisma.inventoryItem.create({ data: { sku: `e2e-race-item-${suffix}` } });
    await prisma.productVariantInventoryItem.create({ data: { variantId: variant.id, inventoryItemId: inventoryItem.id } });
    await prisma.inventoryLevel.create({
      data: { inventoryItemId: inventoryItem.id, locationId: location.id, stockedQuantity: 1, reservedQuantity: 0, version: 0 },
    });
    store = await prisma.store.create({
      data: {
        name: `E2E Race Store ${suffix}`,
        code: `e2e-race-${suffix}`,
        currencyCode: 'MXN',
        regionId: 'mexico',
      },
    });
    customer = await prisma.customer.create({
      data: { storeId: store.id, email: `race-${suffix}@example.com`, firstName: 'Race', lastName: 'Customer' },
    });
  });

  afterAll(async () => {
    await prisma.stockReservation.deleteMany({ where: { variantId: variant.id } });
    await prisma.order.deleteMany({ where: { storeId: store.id } });
    await prisma.cart.deleteMany({ where: { storeId: store.id } });
    await prisma.customer.delete({ where: { id: customer.id } });
    await prisma.store.delete({ where: { id: store.id } });
    await prisma.inventoryLevel.deleteMany({ where: { inventoryItemId: inventoryItem.id } });
    await prisma.productVariantInventoryItem.deleteMany({ where: { variantId: variant.id } });
    await prisma.inventoryItem.delete({ where: { id: inventoryItem.id } });
    await prisma.stockLocation.delete({ where: { id: location.id } });
    await prisma.productVariant.delete({ where: { id: variant.id } });
    await prisma.product.delete({ where: { id: product.id } });
    await app.close();
  });

  it('solo una reserva concurrente gana el último ítem y release() devuelve el stock', async () => {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const line = {
      cartLineId: 'line-1',
      variantId: variant.id,
      productId: product.id,
      productTitle: 'Producto',
      variantTitle: 'Default',
      sku: 'SKU',
      quantity: 1,
      currencyCode: 'MXN',
      unitPrice: 10,
      stockLocationId: location.id,
    };

    const orderIds: string[] = [];
    for (let index = 0; index < 5; index += 1) {
      const cart = await prisma.cart.create({
        data: {
          storeId: store.id,
          channel: 'web',
          token: `race-${suffix}-${index}`,
          customerId: customer.id,
          status: 'ordered',
          checkoutStep: 'confirmation',
          expiresAt,
        },
      });
      const order = await prisma.order.create({
        data: {
          storeId: store.id,
          orderNumber: `RACE-${suffix}-${index}`,
          cartId: cart.id,
          customerId: customer.id,
          channel: 'web',
          status: 'pending',
          paymentStatus: 'pending',
          currencyCode: 'MXN',
          subtotal: 10,
          shippingTotal: 0,
          taxTotal: 0,
          total: 10,
          shippingAddress: {},
          billingAddress: {},
          shippingMethod: {},
          paymentMethod: {},
        },
      });
      orderIds.push(order.id);
    }
    const results = await Promise.all(orderIds.map((orderId) => stock.reserve({ orderId, expiresAt, lines: [line] })));

    const winners = orderIds.filter((_, index) => results[index]);
    expect(winners).toHaveLength(1);

    const levelAfterReserve = await prisma.inventoryLevel.findUniqueOrThrow({
      where: { inventoryItemId_locationId: { inventoryItemId: inventoryItem.id, locationId: location.id } },
    });
    expect(Number(levelAfterReserve.reservedQuantity)).toBe(1);

    await stock.release(winners[0]);

    const levelAfterRelease = await prisma.inventoryLevel.findUniqueOrThrow({
      where: { inventoryItemId_locationId: { inventoryItemId: inventoryItem.id, locationId: location.id } },
    });
    expect(Number(levelAfterRelease.reservedQuantity)).toBe(0);
  });
});
