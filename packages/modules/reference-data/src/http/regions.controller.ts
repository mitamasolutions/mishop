import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NoStoreScope, Public } from '@mitama/contracts';
import { ListRegionsUseCase } from '../application/list-regions/list-regions.use-case';
import { GetRegionUseCase } from '../application/get-region/get-region.use-case';
import type { RegionOutput } from '../application/list-regions/list-regions.dto';

@ApiTags('reference-data')
@Controller('regions')
@Public()
@NoStoreScope()
export class RegionsController {
  constructor(
    private readonly listRegions: ListRegionsUseCase,
    private readonly getRegion: GetRegionUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista las regiones activas' })
  @ApiOkResponse({ description: 'Listado de regiones' })
  async list(): Promise<RegionOutput[]> {
    const result = await this.listRegions.execute();
    return result.unwrapOr([]);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una región por id' })
  @ApiOkResponse({ description: 'Región encontrada' })
  @ApiNotFoundResponse({ description: 'La región no existe' })
  async get(@Param('id') id: string): Promise<RegionOutput> {
    const result = await this.getRegion.execute(id);
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }
}
