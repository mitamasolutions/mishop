/**
 * Sprint 1 · Seed · Datos de referencia
 *
 * Currencies (ISO 4217), regiones, países (ISO 3166), asociación región↔país,
 * catálogo de proveedores de pago (solo lectura para la API) y reglas de IVA
 * por región/categoría. Idempotente vía `upsert` por claves naturales.
 */
import type { PrismaClient } from '@prisma/client';
import currencies from '../seed-data/currencies.json';
import regions from '../seed-data/regions.json';
import countries from '../seed-data/countries.json';

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

export async function seedReferenceData(prisma: PrismaClient): Promise<void> {
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
