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
import { CurrentUser, NoStoreScope, RequirePermission, type AuthenticatedUser } from '@mitama/contracts';
import { CreateTerritoryUseCase } from '../application/territory/create-territory.use-case';
import { UpdateTerritoryUseCase } from '../application/territory/update-territory.use-case';
import { DeactivateTerritoryUseCase } from '../application/territory/deactivate-territory.use-case';
import { GetTerritoryUseCase, ListTerritoriesByRegionUseCase } from '../application/territory/query-territory.use-case';
import type { CreateTerritoryOutput, TerritoryOutput } from '../application/territory/territory.dto';
import {
  DuplicateTerritoryCodeError,
  RegionNotFoundError,
  TerritoryHasActiveZonesError,
  TerritoryNotFoundError,
} from '../domain/errors';
import { CreateTerritoryRequestDto, UpdateTerritoryRequestDto } from './dto/territory.request.dto';

@ApiTags('territories')
@Controller()
@NoStoreScope()
export class TerritoriesController {
  constructor(
    private readonly createTerritoryUseCase: CreateTerritoryUseCase,
    private readonly updateTerritoryUseCase: UpdateTerritoryUseCase,
    private readonly deactivateTerritoryUseCase: DeactivateTerritoryUseCase,
    private readonly getTerritoryUseCase: GetTerritoryUseCase,
    private readonly listTerritoriesByRegion: ListTerritoriesByRegionUseCase,
  ) {}

  @Get('regions/:regionId/territories')
  @RequirePermission('territories.read')
  @ApiOperation({ summary: 'Lista los territorios de una región' })
  @ApiOkResponse({ description: 'Listado de territorios' })
  async list(@Param('regionId') regionId: string): Promise<TerritoryOutput[]> {
    const result = await this.listTerritoriesByRegion.execute(regionId);
    return result.unwrapOr([]);
  }

  @Post('regions/:regionId/territories')
  @RequirePermission('territories.create')
  @ApiOperation({ summary: 'Crea un territorio dentro de una región' })
  @ApiCreatedResponse({ description: 'Territorio creado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'La región no existe' })
  @ApiConflictResponse({ description: 'El código ya existe en esta región' })
  async create(
    @Param('regionId') regionId: string,
    @Body() body: CreateTerritoryRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<CreateTerritoryOutput> {
    const result = await this.createTerritoryUseCase.execute({
      regionId,
      name: body.name,
      code: body.code,
      shipping: {
        automaticFulfillment: body.automaticFulfillment,
        minSubtotal: body.minSubtotal,
        minSubtotalWithTax: body.minSubtotalWithTax,
        freeShippingThreshold: body.freeShippingThreshold,
        freeShippingThresholdWithTax: body.freeShippingThresholdWithTax,
        freeShippingNoDiscount: body.freeShippingNoDiscount,
        shippingCost: body.shippingCost,
        description: body.description,
      },
      actorUserId: user?.id ?? '',
    });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof RegionNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof DuplicateTerritoryCodeError) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    return result.value;
  }

  @Get('territories/:id')
  @RequirePermission('territories.read')
  @ApiOperation({ summary: 'Obtiene un territorio por id' })
  @ApiOkResponse({ description: 'Territorio encontrado' })
  @ApiNotFoundResponse({ description: 'El territorio no existe' })
  async get(@Param('id') id: string): Promise<TerritoryOutput> {
    const result = await this.getTerritoryUseCase.execute(id);
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }

  @Patch('territories/:id')
  @RequirePermission('territories.update')
  @ApiOperation({ summary: 'Actualiza un territorio' })
  @ApiOkResponse({ description: 'Territorio actualizado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'El territorio no existe' })
  @ApiConflictResponse({ description: 'El código ya existe en la región' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateTerritoryRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<void> {
    const result = await this.updateTerritoryUseCase.execute({
      territoryId: id,
      name: body.name,
      code: body.code,
      isActive: body.isActive,
      shipping: {
        automaticFulfillment: body.automaticFulfillment,
        minSubtotal: body.minSubtotal,
        minSubtotalWithTax: body.minSubtotalWithTax,
        freeShippingThreshold: body.freeShippingThreshold,
        freeShippingThresholdWithTax: body.freeShippingThresholdWithTax,
        freeShippingNoDiscount: body.freeShippingNoDiscount,
        shippingCost: body.shippingCost,
        description: body.description,
      },
      actorUserId: user?.id ?? '',
    });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof TerritoryNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof DuplicateTerritoryCodeError) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  @Delete('territories/:id')
  @HttpCode(204)
  @RequirePermission('territories.delete')
  @ApiOperation({ summary: 'Desactiva (soft delete) un territorio' })
  @ApiNoContentResponse({ description: 'Territorio desactivado' })
  @ApiNotFoundResponse({ description: 'El territorio no existe' })
  @ApiConflictResponse({ description: 'El territorio tiene zonas activas' })
  async deactivate(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser): Promise<void> {
    const result = await this.deactivateTerritoryUseCase.execute({
      territoryId: id,
      actorUserId: user?.id ?? '',
    });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof TerritoryNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof TerritoryHasActiveZonesError) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException((error as Error).message);
    }
  }
}
