import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NoStoreScope, Public } from '@mitama/contracts';
import { ListCurrenciesUseCase } from '../application/list-currencies/list-currencies.use-case';
import { GetCurrencyUseCase } from '../application/get-currency/get-currency.use-case';
import type { CurrencyOutput } from '../application/list-currencies/list-currencies.dto';

@ApiTags('reference-data')
@Controller('currencies')
@Public()
@NoStoreScope()
export class CurrenciesController {
  constructor(
    private readonly listCurrencies: ListCurrenciesUseCase,
    private readonly getCurrency: GetCurrencyUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista las monedas activas' })
  @ApiOkResponse({ description: 'Listado de monedas' })
  async list(): Promise<CurrencyOutput[]> {
    const result = await this.listCurrencies.execute();
    return result.unwrapOr([]);
  }

  @Get(':code')
  @ApiOperation({ summary: 'Obtiene una moneda por código ISO 4217' })
  @ApiOkResponse({ description: 'Moneda encontrada' })
  @ApiNotFoundResponse({ description: 'La moneda no existe' })
  async get(@Param('code') code: string): Promise<CurrencyOutput> {
    const result = await this.getCurrency.execute(code);
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }
}
