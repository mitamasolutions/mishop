/**
 * Sprint 1 · Seed · Tienda demo y configuración de checkout
 *
 * Crea una tienda demo en MXN (región `mexico`) con los métodos de pago,
 * un método de envío "Pickup en tienda" y la configuración de impuestos
 * (`mx-iva`) listos para arrancar el checkout end-to-end en desarrollo.
 */
import type { PrismaClient, Prisma } from '@prisma/client';

const DEMO_STORE_CODE = 'tienda-demo';

export async function seedDemoStore(prisma: PrismaClient): Promise<{ id: string }> {
  const data: Prisma.StoreCreateInput = {
    code: DEMO_STORE_CODE,
    name: 'Tienda Demo',
    currency: { connect: { code: 'MXN' } },
    region: { connect: { id: 'mexico' } },
    isActive: true,
  };

  const store = await prisma.store.upsert({
    where: { code: DEMO_STORE_CODE },
    create: data,
    update: { name: data.name, isActive: true },
  });
  await seedStoreCheckoutSettings(prisma, store.id);
  return { id: store.id };
}

async function seedStoreCheckoutSettings(prisma: PrismaClient, storeId: string): Promise<void> {
  for (const method of [
    { providerCode: 'stripe', displayName: 'Stripe', captureMode: 'automatic' },
    { providerCode: 'mercado-pago', displayName: 'Mercado Pago', captureMode: 'automatic' },
    { providerCode: 'manual', displayName: 'Transferencia bancaria', captureMode: 'manual' },
    { providerCode: 'cash', displayName: 'Efectivo', captureMode: 'manual' },
  ]) {
    await prisma.storePaymentMethod.upsert({
      where: { storeId_providerCode: { storeId, providerCode: method.providerCode } },
      create: { storeId, providerCode: method.providerCode, displayName: method.displayName, captureMode: method.captureMode, enabled: true },
      update: { displayName: method.displayName, captureMode: method.captureMode, enabled: true },
    });
  }

  await prisma.storeShippingMethod.upsert({
    where: { id: `${storeId}-pickup` },
    create: { id: `${storeId}-pickup`, storeId, providerCode: 'default', name: 'Pickup en tienda', enabled: true, strategy: 'pickup', baseAmount: 0 },
    update: { name: 'Pickup en tienda', enabled: true, strategy: 'pickup', baseAmount: 0 },
  });

  await prisma.storeTaxSetting.upsert({
    where: { storeId },
    create: { storeId, regionId: 'mexico', providerCode: 'mx-iva', pricesIncludeTax: false },
    update: { regionId: 'mexico', providerCode: 'mx-iva' },
  });
}
