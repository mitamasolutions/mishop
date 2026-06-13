import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, NoStoreScope, type AuthenticatedUser } from '@mitama/contracts';
import { CreateStockLocationUseCase } from '../application/create-stock-location/create-stock-location.use-case';
import { UpdateStockLocationUseCase } from '../application/update-stock-location/update-stock-location.use-case';
import { SetStockLocationStatusUseCase } from '../application/set-stock-location-status/set-stock-location-status.use-case';
import { ListStockLocationsUseCase } from '../application/list-stock-locations/list-stock-locations.use-case';
import type { StockLocationOutput } from '../application/stock-location.dto';
import { StockLocationNotFoundError } from '../domain/errors';
import { CreateStockLocationRequestDto } from './dto/create-stock-location.request.dto';
import { UpdateStockLocationRequestDto } from './dto/update-stock-location.request.dto';
import { SetStockLocationStatusRequestDto } from './dto/set-stock-location-status.request.dto';

@ApiTags('inventory')
@Controller('inventory/locations')
@NoStoreScope()
export class StockLocationsController {
  constructor(
    private readonly createLocation: CreateStockLocationUseCase,
    private readonly updateLocation: UpdateStockLocationUseCase,
    private readonly setLocationStatus: SetStockLocationStatusUseCase,
    private readonly listLocations: ListStockLocationsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista las ubicaciones de stock' })
  @ApiOkResponse({ description: 'Listado de ubicaciones' })
  async list(): Promise<StockLocationOutput[]> {
    const result = await this.listLocations.execute();
    return result.unwrapOr([]);
  }

  @Post()
  @ApiOperation({ summary: 'Crea una ubicación de stock' })
  @ApiCreatedResponse({ description: 'Ubicación creada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  async create(
    @Body() body: CreateStockLocationRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<StockLocationOutput> {
    const result = await this.createLocation.execute({
      name: body.name,
      metadata: body.metadata ?? null,
      actorUserId: user?.id ?? null,
    });
    if (result.isErr()) {
      throw new BadRequestException(result.error.message);
    }
    return result.value;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza una ubicación de stock' })
  @ApiOkResponse({ description: 'Ubicación actualizada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'La ubicación no existe' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateStockLocationRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<StockLocationOutput> {
    const result = await this.updateLocation.execute({ id, ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof StockLocationNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    return result.value;
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activa o desactiva una ubicación de stock' })
  @ApiOkResponse({ description: 'Estado actualizado' })
  @ApiNotFoundResponse({ description: 'La ubicación no existe' })
  async setStatus(
    @Param('id') id: string,
    @Body() body: SetStockLocationStatusRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<StockLocationOutput> {
    const result = await this.setLocationStatus.execute({ id, isActive: body.isActive, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }
}
