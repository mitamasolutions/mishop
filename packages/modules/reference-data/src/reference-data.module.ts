/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Module } from '@nestjs/common';
import { createModuleProviders } from '@mitama/contracts';
import { REFERENCE_DATA_TOKENS } from './reference-data.tokens';

// Repositorios
import { PrismaCurrencyRepository } from './infra/prisma-currency.repository';
import { PrismaRegionRepository } from './infra/prisma-region.repository';
import { PrismaCountryRepository } from './infra/prisma-country.repository';
import { PrismaPaymentProviderRepository } from './infra/prisma-payment-provider.repository';
import { PrismaTerritoryRepository } from './infra/prisma-territory.repository';
import { PrismaZoneRepository } from './infra/prisma-zone.repository';

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
  providers: createModuleProviders([
    // ── Adapters ──────────────────────────────────────────────────────────
    { provide: T.currencyRepository, useClass: PrismaCurrencyRepository },
    { provide: T.regionRepository, useClass: PrismaRegionRepository },
    { provide: T.countryRepository, useClass: PrismaCountryRepository },
    { provide: T.paymentProviderRepository, useClass: PrismaPaymentProviderRepository },
    { provide: T.territoryRepository, useClass: PrismaTerritoryRepository },
    { provide: T.zoneRepository, useClass: PrismaZoneRepository },

    // ── Use cases: monedas ────────────────────────────────────────────────
    { useCase: ListCurrenciesUseCase, inject: [T.currencyRepository] },
    { useCase: GetCurrencyUseCase, inject: [T.currencyRepository] },

    // ── Use cases: regiones (lectura) ─────────────────────────────────────
    { useCase: ListRegionsUseCase, inject: [T.regionRepository] },
    { useCase: GetRegionUseCase, inject: [T.regionRepository] },

    // ── Use cases: regiones (escritura) ───────────────────────────────────
    { useCase: CreateRegionUseCase, inject: [T.regionRepository, T.currencyRepository] },
    { useCase: UpdateRegionUseCase, inject: [T.regionRepository, T.currencyRepository, T.countryRepository, T.paymentProviderRepository] },
    { useCase: DeactivateRegionUseCase, inject: [T.regionRepository] },

    // ── Use cases: países ─────────────────────────────────────────────────
    { useCase: ListCountriesUseCase, inject: [T.countryRepository] },
    { useCase: GetCountryUseCase, inject: [T.countryRepository] },

    // ── Use cases: proveedores de pago ────────────────────────────────────
    { useCase: ListPaymentProvidersUseCase, inject: [T.paymentProviderRepository] },

    // ── Use cases: territorios ────────────────────────────────────────────
    { useCase: CreateTerritoryUseCase, inject: [T.regionRepository, T.territoryRepository] },
    { useCase: UpdateTerritoryUseCase, inject: [T.territoryRepository] },
    { useCase: DeactivateTerritoryUseCase, inject: [T.territoryRepository] },
    { useCase: GetTerritoryUseCase, inject: [T.territoryRepository] },
    { useCase: ListTerritoriesByRegionUseCase, inject: [T.territoryRepository] },

    // ── Use cases: zonas ──────────────────────────────────────────────────
    { useCase: CreateZoneUseCase, inject: [T.territoryRepository, T.zoneRepository] },
    { useCase: UpdateZoneUseCase, inject: [T.zoneRepository] },
    { useCase: DeactivateZoneUseCase, inject: [T.zoneRepository] },
    { useCase: GetZoneUseCase, inject: [T.zoneRepository] },
    { useCase: ListZonesByTerritoryUseCase, inject: [T.zoneRepository] },
  ]),
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
