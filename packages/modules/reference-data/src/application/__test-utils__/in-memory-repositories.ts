/**
 * Adapters in-memory para specs de application/ del módulo reference-data.
 * Ninguno toca Prisma ni NestJS.
 */
import type { RecordActivityInput } from '@mitama/activity-log';
import { Currency } from '../../domain/currency.entity';
import type { CurrencyRepository } from '../../domain/currency.repository';
import { Region } from '../../domain/region.entity';
import type { RegionRepository } from '../../domain/region.repository';
import { Country } from '../../domain/country.entity';
import type { CountryRepository } from '../../domain/country.repository';
import { PaymentProvider } from '../../domain/payment-provider.entity';
import type { PaymentProviderRepository } from '../../domain/payment-provider.repository';
import { Territory } from '../../domain/territory.entity';
import type { TerritoryRepository } from '../../domain/territory.repository';
import { Zone } from '../../domain/zone.entity';
import type { ZoneRepository } from '../../domain/zone.repository';

export class InMemoryRegionRepository implements RegionRepository {
  readonly regions = new Map<string, Region>();
  readonly recordedActivity: RecordActivityInput[] = [];

  async findAll(): Promise<Region[]> {
    return [...this.regions.values()].filter((r) => r.isActive);
  }

  async findById(id: string): Promise<Region | null> {
    return this.regions.get(id) ?? null;
  }

  async findByIdWithDetails(id: string): Promise<Region | null> {
    return this.regions.get(id) ?? null;
  }

  async save(region: Region, activity: RecordActivityInput): Promise<void> {
    this.regions.set(region.id, region);
    this.recordedActivity.push(activity);
  }

  async softDelete(id: string, activity: RecordActivityInput): Promise<void> {
    const region = this.regions.get(id);
    if (region) {
      this.regions.set(id, region.deactivate());
    }
    this.recordedActivity.push(activity);
  }

  async hasActiveDependencies(_id: string): Promise<boolean> {
    return false;
  }
}

export class InMemoryCurrencyRepository implements CurrencyRepository {
  readonly currencies = new Map<string, Currency>();

  async findAll(): Promise<Currency[]> {
    return [...this.currencies.values()];
  }

  async findByCode(code: string): Promise<Currency | null> {
    return this.currencies.get(code) ?? null;
  }
}

export class InMemoryCountryRepository implements CountryRepository {
  readonly countries = new Map<string, Country>();

  async findAll(): Promise<Country[]> {
    return [...this.countries.values()];
  }

  async findByIso2(iso2: string): Promise<Country | null> {
    return this.countries.get(iso2) ?? null;
  }
}

export class InMemoryPaymentProviderRepository implements PaymentProviderRepository {
  readonly providers = new Map<string, PaymentProvider>();

  async findAll(): Promise<PaymentProvider[]> {
    return [...this.providers.values()];
  }

  async findById(id: string): Promise<PaymentProvider | null> {
    return this.providers.get(id) ?? null;
  }

  async findByIds(ids: string[]): Promise<PaymentProvider[]> {
    return ids.flatMap((id) => {
      const p = this.providers.get(id);
      return p ? [p] : [];
    });
  }
}

export class InMemoryTerritoryRepository implements TerritoryRepository {
  readonly territories = new Map<string, Territory>();
  readonly recordedActivity: RecordActivityInput[] = [];

  async findById(id: string): Promise<Territory | null> {
    return this.territories.get(id) ?? null;
  }

  async findByRegionId(regionId: string): Promise<Territory[]> {
    return [...this.territories.values()].filter((t) => t.regionId === regionId && t.isActive);
  }

  async findByCodeAndRegionId(code: string, regionId: string): Promise<Territory | null> {
    for (const t of this.territories.values()) {
      if (t.code === code && t.regionId === regionId) return t;
    }
    return null;
  }

  async save(territory: Territory, activity: RecordActivityInput): Promise<void> {
    this.territories.set(territory.id, territory);
    this.recordedActivity.push(activity);
  }

  async softDelete(id: string, activity: RecordActivityInput): Promise<void> {
    const t = this.territories.get(id);
    if (t) {
      this.territories.set(id, t.deactivate());
    }
    this.recordedActivity.push(activity);
  }

  async hasActiveZones(_territoryId: string): Promise<boolean> {
    return false;
  }
}

export class InMemoryZoneRepository implements ZoneRepository {
  readonly zones = new Map<string, Zone>();
  readonly recordedActivity: RecordActivityInput[] = [];

  async findById(id: string): Promise<Zone | null> {
    return this.zones.get(id) ?? null;
  }

  async findByTerritoryId(territoryId: string): Promise<Zone[]> {
    return [...this.zones.values()].filter((z) => z.territoryId === territoryId && z.isActive);
  }

  async findByCodeAndTerritoryId(code: string, territoryId: string): Promise<Zone | null> {
    for (const z of this.zones.values()) {
      if (z.code === code && z.territoryId === territoryId) return z;
    }
    return null;
  }

  async save(zone: Zone, activity: RecordActivityInput): Promise<void> {
    this.zones.set(zone.id, zone);
    this.recordedActivity.push(activity);
  }

  async softDelete(id: string, activity: RecordActivityInput): Promise<void> {
    const z = this.zones.get(id);
    if (z) {
      this.zones.set(id, z.deactivate());
    }
    this.recordedActivity.push(activity);
  }
}
