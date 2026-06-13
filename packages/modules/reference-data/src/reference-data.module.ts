/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Module } from '@nestjs/common';
import { REFERENCE_DATA_TOKENS } from './reference-data.tokens';

// Repositorios
import { PrismaCurrencyRepository } from './infra/prisma-currency.repository';
import { PrismaRegionRepository } from './infra/prisma-region.repository';
import { PrismaCountryRepository } from './infra/prisma-country.repository';
import { PrismaPaymentProviderRepository } from './infra/prisma-payment-provider.repository';
import { PrismaTerritoryRepository } from './infra/prisma-territory.repository';
import { PrismaZoneRepository } from './infra/prisma-zone.repository';

// Tipos de puertos
import type { CurrencyRepository } from './domain/currency.repository';
import type { RegionRepository } from './domain/region.repository';
import type { CountryRepository } from './domain/country.repository';
import type { PaymentProviderRepository } from './domain/payment-provider.repository';
import type { TerritoryRepository } from './domain/territory.repository';
import type { ZoneRepository } from './domain/zone.repository';

// Use cases — lectura existentes
import { ListCurrenciesUseCase } from './application/list-currencies/list-currencies.use-case';
import { GetCurrencyUseCase } from './application/get-currency/get-currency.use-case';
import { ListRegionsUseCase } from './application/list-regions/list-regions.use-case';
import { GetRegionUseCase } from './application/get-region/get-region.use-case';
import { ListCountriesUseCase } from './application/list-countries/list-countries.use-case';
import { GetCountryUseCase } from './application/get-country/get-country.use-case';

// Use cases — región escritura
import { CreateRegionUseCase } from './application/region/create-region.use-case';
import { UpdateRegionUseCase } from './application/region/update-region.use-case';
import { DeactivateRegionUseCase } from './application/region/deactivate-region.use-case';

// Use cases — territorio
import { CreateTerritoryUseCase } from './application/territory/create-territory.use-case';
import { UpdateTerritoryUseCase } from './application/territory/update-territory.use-case';
import { DeactivateTerritoryUseCase } from './application/territory/deactivate-territory.use-case';
import { GetTerritoryUseCase, ListTerritoriesByRegionUseCase } from './application/territory/query-territory.use-case';

// Use cases — zona
import { CreateZoneUseCase } from './application/zone/create-zone.use-case';
import { UpdateZoneUseCase } from './application/zone/update-zone.use-case';
import { DeactivateZoneUseCase } from './application/zone/deactivate-zone.use-case';
import { GetZoneUseCase, ListZonesByTerritoryUseCase } from './application/zone/query-zone.use-case';

// Use cases — proveedores de pago
import { ListPaymentProvidersUseCase } from './application/list-payment-providers/list-payment-providers.use-case';

// Controladores
import { CurrenciesController } from './http/currencies.controller';
import { RegionsController } from './http/regions.controller';
import { CountriesController } from './http/countries.controller';
import { PaymentProvidersController } from './http/payment-providers.controller';
import { TerritoriesController } from './http/territories.controller';
import { ZonesController } from './http/zones.controller';

const T = REFERENCE_DATA_TOKENS;

@Module({
  controllers: [
    CurrenciesController,
    RegionsController,
    CountriesController,
    PaymentProvidersController,
    TerritoriesController,
    ZonesController,
  ],
  providers: [
    // ── Adapters ──────────────────────────────────────────────────────────
    { provide: T.currencyRepository, useClass: PrismaCurrencyRepository },
    { provide: T.regionRepository, useClass: PrismaRegionRepository },
    { provide: T.countryRepository, useClass: PrismaCountryRepository },
    { provide: T.paymentProviderRepository, useClass: PrismaPaymentProviderRepository },
    { provide: T.territoryRepository, useClass: PrismaTerritoryRepository },
    { provide: T.zoneRepository, useClass: PrismaZoneRepository },

    // ── Use cases: monedas ────────────────────────────────────────────────
    {
      provide: ListCurrenciesUseCase,
      useFactory: (r: CurrencyRepository) => new ListCurrenciesUseCase(r),
      inject: [T.currencyRepository],
    },
    {
      provide: GetCurrencyUseCase,
      useFactory: (r: CurrencyRepository) => new GetCurrencyUseCase(r),
      inject: [T.currencyRepository],
    },

    // ── Use cases: regiones (lectura) ─────────────────────────────────────
    {
      provide: ListRegionsUseCase,
      useFactory: (r: RegionRepository) => new ListRegionsUseCase(r),
      inject: [T.regionRepository],
    },
    {
      provide: GetRegionUseCase,
      useFactory: (r: RegionRepository) => new GetRegionUseCase(r),
      inject: [T.regionRepository],
    },

    // ── Use cases: regiones (escritura) ───────────────────────────────────
    {
      provide: CreateRegionUseCase,
      useFactory: (r: RegionRepository, c: CurrencyRepository) => new CreateRegionUseCase(r, c),
      inject: [T.regionRepository, T.currencyRepository],
    },
    {
      provide: UpdateRegionUseCase,
      useFactory: (
        r: RegionRepository,
        c: CurrencyRepository,
        co: CountryRepository,
        pp: PaymentProviderRepository,
      ) => new UpdateRegionUseCase(r, c, co, pp),
      inject: [T.regionRepository, T.currencyRepository, T.countryRepository, T.paymentProviderRepository],
    },
    {
      provide: DeactivateRegionUseCase,
      useFactory: (r: RegionRepository) => new DeactivateRegionUseCase(r),
      inject: [T.regionRepository],
    },

    // ── Use cases: países ─────────────────────────────────────────────────
    {
      provide: ListCountriesUseCase,
      useFactory: (r: CountryRepository) => new ListCountriesUseCase(r),
      inject: [T.countryRepository],
    },
    {
      provide: GetCountryUseCase,
      useFactory: (r: CountryRepository) => new GetCountryUseCase(r),
      inject: [T.countryRepository],
    },

    // ── Use cases: proveedores de pago ────────────────────────────────────
    {
      provide: ListPaymentProvidersUseCase,
      useFactory: (r: PaymentProviderRepository) => new ListPaymentProvidersUseCase(r),
      inject: [T.paymentProviderRepository],
    },

    // ── Use cases: territorios ────────────────────────────────────────────
    {
      provide: CreateTerritoryUseCase,
      useFactory: (r: RegionRepository, t: TerritoryRepository) => new CreateTerritoryUseCase(r, t),
      inject: [T.regionRepository, T.territoryRepository],
    },
    {
      provide: UpdateTerritoryUseCase,
      useFactory: (t: TerritoryRepository) => new UpdateTerritoryUseCase(t),
      inject: [T.territoryRepository],
    },
    {
      provide: DeactivateTerritoryUseCase,
      useFactory: (t: TerritoryRepository) => new DeactivateTerritoryUseCase(t),
      inject: [T.territoryRepository],
    },
    {
      provide: GetTerritoryUseCase,
      useFactory: (t: TerritoryRepository) => new GetTerritoryUseCase(t),
      inject: [T.territoryRepository],
    },
    {
      provide: ListTerritoriesByRegionUseCase,
      useFactory: (t: TerritoryRepository) => new ListTerritoriesByRegionUseCase(t),
      inject: [T.territoryRepository],
    },

    // ── Use cases: zonas ──────────────────────────────────────────────────
    {
      provide: CreateZoneUseCase,
      useFactory: (t: TerritoryRepository, z: ZoneRepository) => new CreateZoneUseCase(t, z),
      inject: [T.territoryRepository, T.zoneRepository],
    },
    {
      provide: UpdateZoneUseCase,
      useFactory: (z: ZoneRepository) => new UpdateZoneUseCase(z),
      inject: [T.zoneRepository],
    },
    {
      provide: DeactivateZoneUseCase,
      useFactory: (z: ZoneRepository) => new DeactivateZoneUseCase(z),
      inject: [T.zoneRepository],
    },
    {
      provide: GetZoneUseCase,
      useFactory: (z: ZoneRepository) => new GetZoneUseCase(z),
      inject: [T.zoneRepository],
    },
    {
      provide: ListZonesByTerritoryUseCase,
      useFactory: (z: ZoneRepository) => new ListZonesByTerritoryUseCase(z),
      inject: [T.zoneRepository],
    },
  ],
  exports: [
    T.currencyRepository,
    T.regionRepository,
    T.countryRepository,
    T.paymentProviderRepository,
    T.territoryRepository,
    T.zoneRepository,
  ],
})
export class ReferenceDataModule {}
