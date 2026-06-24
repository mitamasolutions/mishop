import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/data';
import { recordActivity, type RecordActivityInput } from '../../activity-log';
import { Region } from '../domain/region.entity';
import type { RegionRepository } from '../domain/region.repository';

@Injectable()
export class PrismaRegionRepository implements RegionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Region[]> {
    const rows = await this.prisma.region.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) =>
      Region.rehydrate(row.id, {
        name: row.name,
        currencyCode: row.currencyCode,
        automaticTaxes: row.automaticTaxes,
        isActive: row.isActive,
        countriesIso2: [],
        paymentProviderIds: [],
      }),
    );
  }

  async findById(id: string): Promise<Region | null> {
    const row = await this.prisma.region.findFirst({ where: { id, deletedAt: null } });
    if (!row) return null;
    return Region.rehydrate(row.id, {
      name: row.name,
      currencyCode: row.currencyCode,
      automaticTaxes: row.automaticTaxes,
      isActive: row.isActive,
      countriesIso2: [],
      paymentProviderIds: [],
    });
  }

  async findByIdWithDetails(id: string): Promise<Region | null> {
    const row = await this.prisma.region.findFirst({
      where: { id, deletedAt: null },
      include: {
        countries: { select: { countryIso2: true } },
        paymentProviders: { select: { paymentProviderId: true } },
      },
    });
    if (!row) return null;
    return Region.rehydrate(row.id, {
      name: row.name,
      currencyCode: row.currencyCode,
      automaticTaxes: row.automaticTaxes,
      isActive: row.isActive,
      countriesIso2: row.countries.map((c) => c.countryIso2),
      paymentProviderIds: row.paymentProviders.map((p) => p.paymentProviderId),
    });
  }

  async save(region: Region, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.region.upsert({
        where: { id: region.id },
        create: {
          id: region.id,
          name: region.name,
          currencyCode: region.currencyCode,
          automaticTaxes: region.automaticTaxes,
          isActive: region.isActive,
        },
        update: {
          name: region.name,
          currencyCode: region.currencyCode,
          automaticTaxes: region.automaticTaxes,
          isActive: region.isActive,
        },
      });

      // Reemplaza la lista de países asociados
      await tx.regionCountry.deleteMany({ where: { regionId: region.id } });
      if (region.countriesIso2.length > 0) {
        await tx.regionCountry.createMany({
          data: region.countriesIso2.map((iso2) => ({ regionId: region.id, countryIso2: iso2 })),
          skipDuplicates: true,
        });
      }

      // Reemplaza la lista de proveedores de pago
      await tx.regionPaymentProvider.deleteMany({ where: { regionId: region.id } });
      if (region.paymentProviderIds.length > 0) {
        await tx.regionPaymentProvider.createMany({
          data: region.paymentProviderIds.map((pid) => ({ regionId: region.id, paymentProviderId: pid })),
          skipDuplicates: true,
        });
      }

      await recordActivity(tx, activity);
    });
  }

  async softDelete(id: string, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.region.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() },
      });
      await recordActivity(tx, activity);
    });
  }

  async hasActiveDependencies(id: string): Promise<boolean> {
    const [territoryCount, storeCount] = await Promise.all([
      this.prisma.territory.count({ where: { regionId: id, deletedAt: null, isActive: true } }),
      this.prisma.store.count({ where: { regionId: id, isActive: true } }),
    ]);
    return territoryCount > 0 || storeCount > 0;
  }
}
