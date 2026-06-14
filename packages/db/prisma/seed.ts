/**
 * Seed de desarrollo/demo. Idempotente: usa upsert (o find+create) por
 * claves naturales, así que correrlo varias veces no duplica datos.
 *
 * Carga: datos de referencia (currencies/regions/countries/payment-providers),
 * catálogo de roles predefinidos, un usuario Super Admin y una tienda demo.
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { PERMISSIONS, type Permission } from '@mitama/contracts';
import currencies from './seed-data/currencies.json';
import regions from './seed-data/regions.json';
import countries from './seed-data/countries.json';

const prisma = new PrismaClient();

const SUPER_ADMIN_EMAIL = 'admin@mitama.local';
const SUPER_ADMIN_NAME = 'Super Admin';
const DEMO_STORE_CODE = 'tienda-demo';

const STORE_ADMIN_PERMISSIONS: Permission[] = [...PERMISSIONS];

const OPERATOR_PERMISSIONS: Permission[] = ['stores.read', 'settings.read', 'activity-log.read', 'users.read'];

const TAX_RULES = [
  { regionId: 'mexico', category: 'standard', rate: '0.16' },
  { regionId: 'mexico', category: 'zero', rate: '0' },
  { regionId: 'mexico', category: 'exempt', rate: '0' },
];

const PAYMENT_PROVIDERS = [
  { code: 'stripe', name: 'Stripe' },
  { code: 'mercado-pago', name: 'MercadoPago' },
  { code: 'manual', name: 'Transferencia manual' },
  { code: 'cash', name: 'Efectivo' },
  { code: 'paypal', name: 'PayPal' },
  { code: 'transferencia', name: 'Transferencia bancaria' },
  { code: 'efectivo', name: 'Efectivo (contra entrega)' },
  { code: 'oxxo', name: 'OXXO Pay' },
  { code: 'conekta', name: 'Conekta' },
];

async function seedReferenceData(): Promise<void> {
  for (const currency of currencies as Array<{
    code: string;
    symbol: string;
    symbolNative: string;
    decimalDigits: number;
    rounding: number;
    name: string;
  }>) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      create: currency,
      update: currency,
    });
  }

  for (const region of regions as Array<{ id: string; name: string; currencyCode: string; automaticTaxes: boolean }>) {
    await prisma.region.upsert({
      where: { id: region.id },
      create: region,
      update: { name: region.name, currencyCode: region.currencyCode, automaticTaxes: region.automaticTaxes },
    });
  }

  for (const country of countries as Array<{
    iso2: string;
    iso3: string;
    numCode: string;
    name: string;
    displayName: string;
    regionId: string | null;
  }>) {
    await prisma.country.upsert({
      where: { iso2: country.iso2 },
      create: {
        iso2: country.iso2,
        iso3: country.iso3,
        numCode: country.numCode,
        name: country.name,
        displayName: country.displayName,
      },
      update: {
        iso3: country.iso3,
        numCode: country.numCode,
        name: country.name,
        displayName: country.displayName,
      },
    });
  }

  // Poblar asociaciones región ↔ país (muchos-a-muchos) desde los datos de seed.
  for (const country of countries as Array<{ iso2: string; regionId: string | null }>) {
    if (!country.regionId) continue;
    await prisma.regionCountry.upsert({
      where: { regionId_countryIso2: { regionId: country.regionId, countryIso2: country.iso2 } },
      create: { regionId: country.regionId, countryIso2: country.iso2 },
      update: {},
    });
  }

  // Catálogo de proveedores de pago (solo lectura para la API).
  for (const provider of PAYMENT_PROVIDERS) {
    await prisma.paymentProvider.upsert({
      where: { code: provider.code },
      create: provider,
      update: { name: provider.name },
    });
  }

  for (const rule of TAX_RULES) {
    await prisma.taxRule.upsert({
      where: { regionId_category: { regionId: rule.regionId, category: rule.category } },
      create: rule,
      update: { rate: rule.rate },
    });
  }
}

async function seedRoles(): Promise<{ superAdmin: { id: string } }> {
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

  return { superAdmin };
}

async function seedSuperAdminUser(superAdminRoleId: string): Promise<void> {
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

async function seedDemoStore(): Promise<{ id: string }> {
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
  await seedStoreCheckoutSettings(store.id);
  return { id: store.id };
}

async function seedStoreCheckoutSettings(storeId: string): Promise<void> {
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

async function main(): Promise<void> {
  await seedReferenceData();
  const { superAdmin } = await seedRoles();
  await seedSuperAdminUser(superAdmin.id);
  await seedDemoStore();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
