import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import { Country } from '../domain/country.entity';
import type { CountryRepository } from '../domain/country.repository';

@Injectable()
export class PrismaCountryRepository implements CountryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Country[]> {
    const rows = await this.prisma.country.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) =>
      Country.rehydrate(row.iso2, {
        iso3: row.iso3,
        numCode: row.numCode,
        name: row.name,
        displayName: row.displayName,
      }),
    );
  }

  async findByIso2(iso2: string): Promise<Country | null> {
    const row = await this.prisma.country.findFirst({ where: { iso2, deletedAt: null } });
    if (!row) return null;
    return Country.rehydrate(row.iso2, {
      iso3: row.iso3,
      numCode: row.numCode,
      name: row.name,
      displayName: row.displayName,
    });
  }
}
