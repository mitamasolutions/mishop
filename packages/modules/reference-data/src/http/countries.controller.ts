import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NoStoreScope, Public } from '@mitama/contracts';
import { ListCountriesUseCase } from '../application/list-countries/list-countries.use-case';
import { GetCountryUseCase } from '../application/get-country/get-country.use-case';
import type { CountryOutput } from '../application/list-countries/list-countries.dto';

@ApiTags('reference-data')
@Controller('countries')
@Public()
@NoStoreScope()
export class CountriesController {
  constructor(
    private readonly listCountries: ListCountriesUseCase,
    private readonly getCountry: GetCountryUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista los países activos' })
  @ApiOkResponse({ description: 'Listado de países' })
  async list(): Promise<CountryOutput[]> {
    const result = await this.listCountries.execute();
    return result.unwrapOr([]);
  }

  @Get(':iso2')
  @ApiOperation({ summary: 'Obtiene un país por código ISO 3166-1 alpha-2' })
  @ApiOkResponse({ description: 'País encontrado' })
  @ApiNotFoundResponse({ description: 'El país no existe' })
  async get(@Param('iso2') iso2: string): Promise<CountryOutput> {
    const result = await this.getCountry.execute(iso2);
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }
}
