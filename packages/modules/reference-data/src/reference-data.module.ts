/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Module } from '@nestjs/common';
import { REFERENCE_DATA_TOKENS } from './reference-data.tokens';
import { ListCurrenciesUseCase } from './application/list-currencies/list-currencies.use-case';
import { GetCurrencyUseCase } from './application/get-currency/get-currency.use-case';
import { ListRegionsUseCase } from './application/list-regions/list-regions.use-case';
import { GetRegionUseCase } from './application/get-region/get-region.use-case';
import { ListCountriesUseCase } from './application/list-countries/list-countries.use-case';
import { GetCountryUseCase } from './application/get-country/get-country.use-case';
import type { CurrencyRepository } from './domain/currency.repository';
import type { RegionRepository } from './domain/region.repository';
import type { CountryRepository } from './domain/country.repository';
import { PrismaCurrencyRepository } from './infra/prisma-currency.repository';
import { PrismaRegionRepository } from './infra/prisma-region.repository';
import { PrismaCountryRepository } from './infra/prisma-country.repository';
import { CurrenciesController } from './http/currencies.controller';
import { RegionsController } from './http/regions.controller';
import { CountriesController } from './http/countries.controller';

@Module({
  controllers: [CurrenciesController, RegionsController, CountriesController],
  providers: [
    { provide: REFERENCE_DATA_TOKENS.currencyRepository, useClass: PrismaCurrencyRepository },
    { provide: REFERENCE_DATA_TOKENS.regionRepository, useClass: PrismaRegionRepository },
    { provide: REFERENCE_DATA_TOKENS.countryRepository, useClass: PrismaCountryRepository },
    {
      provide: ListCurrenciesUseCase,
      useFactory: (currencies: CurrencyRepository) => new ListCurrenciesUseCase(currencies),
      inject: [REFERENCE_DATA_TOKENS.currencyRepository],
    },
    {
      provide: GetCurrencyUseCase,
      useFactory: (currencies: CurrencyRepository) => new GetCurrencyUseCase(currencies),
      inject: [REFERENCE_DATA_TOKENS.currencyRepository],
    },
    {
      provide: ListRegionsUseCase,
      useFactory: (regions: RegionRepository) => new ListRegionsUseCase(regions),
      inject: [REFERENCE_DATA_TOKENS.regionRepository],
    },
    {
      provide: GetRegionUseCase,
      useFactory: (regions: RegionRepository) => new GetRegionUseCase(regions),
      inject: [REFERENCE_DATA_TOKENS.regionRepository],
    },
    {
      provide: ListCountriesUseCase,
      useFactory: (countries: CountryRepository) => new ListCountriesUseCase(countries),
      inject: [REFERENCE_DATA_TOKENS.countryRepository],
    },
    {
      provide: GetCountryUseCase,
      useFactory: (countries: CountryRepository) => new GetCountryUseCase(countries),
      inject: [REFERENCE_DATA_TOKENS.countryRepository],
    },
  ],
  exports: [REFERENCE_DATA_TOKENS.currencyRepository, REFERENCE_DATA_TOKENS.regionRepository],
})
export class ReferenceDataModule {}
