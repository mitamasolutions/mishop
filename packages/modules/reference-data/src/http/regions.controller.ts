import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, NoStoreScope, Public, RequirePermission, type AuthenticatedUser } from '@mitama/contracts';
import { ListRegionsUseCase } from '../application/list-regions/list-regions.use-case';
import { GetRegionUseCase } from '../application/get-region/get-region.use-case';
import { CreateRegionUseCase } from '../application/region/create-region.use-case';
import { UpdateRegionUseCase } from '../application/region/update-region.use-case';
import { DeactivateRegionUseCase } from '../application/region/deactivate-region.use-case';
import type { RegionOutput } from '../application/list-regions/list-regions.dto';
import type { CreateRegionOutput } from '../application/region/region.dto';
import { RegionHasActiveDependenciesError, RegionNotFoundError } from '../domain/errors';
import { CreateRegionRequestDto, UpdateRegionRequestDto } from './dto/region.request.dto';

@ApiTags('regions')
@Controller('regions')
@NoStoreScope()
export class RegionsController {
  constructor(
    private readonly listRegions: ListRegionsUseCase,
    private readonly getRegion: GetRegionUseCase,
    private readonly createRegionUseCase: CreateRegionUseCase,
    private readonly updateRegionUseCase: UpdateRegionUseCase,
    private readonly deactivateRegionUseCase: DeactivateRegionUseCase,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Lista las regiones activas' })
  @ApiOkResponse({ description: 'Listado de regiones' })
  async list(): Promise<RegionOutput[]> {
    const result = await this.listRegions.execute();
    return result.unwrapOr([]);
  }

  @Get(':id')
  @Public()
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

  @Post()
  @RequirePermission('regions.create')
  @ApiOperation({ summary: 'Crea una región' })
  @ApiCreatedResponse({ description: 'Región creada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos (nombre o moneda)' })
  async create(
    @Body() body: CreateRegionRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<CreateRegionOutput> {
    const result = await this.createRegionUseCase.execute({
      name: body.name,
      currencyCode: body.currencyCode,
      actorUserId: user?.id ?? '',
    });
    if (result.isErr()) {
      throw new BadRequestException(result.error.message);
    }
    return result.value;
  }

  @Patch(':id')
  @RequirePermission('regions.update')
  @ApiOperation({ summary: 'Actualiza nombre, moneda, países y/o proveedores de pago de una región' })
  @ApiOkResponse({ description: 'Región actualizada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'La región no existe' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateRegionRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<void> {
    const result = await this.updateRegionUseCase.execute({
      regionId: id,
      name: body.name,
      currencyCode: body.currencyCode,
      countriesIso2: body.countriesIso2,
      paymentProviderIds: body.paymentProviderIds,
      actorUserId: user?.id ?? '',
    });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof RegionNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('regions.delete')
  @ApiOperation({ summary: 'Desactiva (soft delete) una región' })
  @ApiNoContentResponse({ description: 'Región desactivada' })
  @ApiNotFoundResponse({ description: 'La región no existe' })
  @ApiConflictResponse({ description: 'La región tiene territorios o tiendas activas' })
  async deactivate(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser): Promise<void> {
    const result = await this.deactivateRegionUseCase.execute({
      regionId: id,
      actorUserId: user?.id ?? '',
    });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof RegionNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof RegionHasActiveDependenciesError) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException((error as Error).message);
    }
  }
}
