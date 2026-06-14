import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, RequirePermission, type AuthenticatedUser } from '@mitama/contracts';
import { CreatePriceListUseCase } from '../application/create-price-list/create-price-list.use-case';
import { UpdatePriceListUseCase } from '../application/update-price-list/update-price-list.use-case';
import { SetPriceListStatusUseCase } from '../application/set-price-list-status/set-price-list-status.use-case';
import { ListPriceListsUseCase } from '../application/list-price-lists/list-price-lists.use-case';
import { GetPriceListUseCase } from '../application/get-price-list/get-price-list.use-case';
import { DeletePriceListUseCase } from '../application/delete-price-list/delete-price-list.use-case';
import { AddPriceListPriceUseCase } from '../application/manage-price-list-prices/add-price-list-price.use-case';
import { UpdatePriceListPriceUseCase } from '../application/manage-price-list-prices/update-price-list-price.use-case';
import { RemovePriceListPriceUseCase } from '../application/manage-price-list-prices/remove-price-list-price.use-case';
import type { PriceListOutput } from '../application/price-list.dto';
import type { ListPriceListsOutput } from '../application/list-price-lists/list-price-lists.dto';
import {
  InvalidDateRangeError,
  InvalidTierPriceRangeError,
  PriceListNotFoundError,
  PriceListPriceNotFoundError,
  ProductVariantNotFoundError,
} from '../domain/errors';
import { CreatePriceListRequestDto } from './dto/create-price-list.request.dto';
import { SetPriceListStatusRequestDto, UpdatePriceListRequestDto } from './dto/update-price-list.request.dto';
import { ListPriceListsRequestDto } from './dto/list-price-lists.request.dto';
import { AddPriceListPriceRequestDto, UpdatePriceListPriceRequestDto } from './dto/price-list-price.request.dto';

@ApiTags('catalog-price-lists')
@Controller('catalog/price-lists')
@RequirePermission('products.read')
export class PriceListsController {
  constructor(
    private readonly createPriceList: CreatePriceListUseCase,
    private readonly updatePriceList: UpdatePriceListUseCase,
    private readonly setPriceListStatus: SetPriceListStatusUseCase,
    private readonly listPriceLists: ListPriceListsUseCase,
    private readonly getPriceList: GetPriceListUseCase,
    private readonly deletePriceList: DeletePriceListUseCase,
    private readonly addPriceListPrice: AddPriceListPriceUseCase,
    private readonly updatePriceListPrice: UpdatePriceListPriceUseCase,
    private readonly removePriceListPrice: RemovePriceListPriceUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista las listas de precios (campañas), paginado' })
  @ApiOkResponse({ description: 'Página de listas de precios' })
  async list(@Query() query: ListPriceListsRequestDto): Promise<ListPriceListsOutput> {
    const result = await this.listPriceLists.execute(query);
    return result.unwrapOr({ items: [], total: 0, page: query.page ?? 1, pageSize: query.pageSize ?? 20 });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una lista de precios por id, con sus overrides' })
  @ApiOkResponse({ description: 'Lista de precios encontrada' })
  @ApiNotFoundResponse({ description: 'La lista de precios no existe' })
  async get(@Param('id') id: string): Promise<PriceListOutput> {
    const result = await this.getPriceList.execute(id);
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }

  @Post()
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Crea una lista de precios (campaña)' })
  @ApiCreatedResponse({ description: 'Lista de precios creada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  async create(@Body() body: CreatePriceListRequestDto, @CurrentUser() user?: AuthenticatedUser): Promise<PriceListOutput> {
    const result = await this.createPriceList.execute({ ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  @Patch(':id')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Actualiza una lista de precios' })
  @ApiOkResponse({ description: 'Lista de precios actualizada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'La lista de precios no existe' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdatePriceListRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PriceListOutput> {
    const result = await this.updatePriceList.execute({ id, ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  @Patch(':id/status')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Cambia el estado (borrador/activa) de una lista de precios' })
  @ApiOkResponse({ description: 'Lista de precios actualizada' })
  @ApiNotFoundResponse({ description: 'La lista de precios no existe' })
  async setStatus(
    @Param('id') id: string,
    @Body() body: SetPriceListStatusRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PriceListOutput> {
    const result = await this.setPriceListStatus.execute({ id, status: body.status, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  @Delete(':id')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Elimina (baja lógica) una lista de precios' })
  @ApiOkResponse({ description: 'Lista de precios eliminada' })
  @ApiNotFoundResponse({ description: 'La lista de precios no existe' })
  async remove(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser): Promise<{ success: true }> {
    const result = await this.deletePriceList.execute({ id, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return { success: true };
  }

  // ----- Precios override de variantes -----

  @Post(':id/prices')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Agrega un precio override de variante a la lista' })
  @ApiCreatedResponse({ description: 'Lista de precios actualizada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos o rango de cantidades inválido' })
  @ApiNotFoundResponse({ description: 'La lista de precios o la variante no existen' })
  async addPrice(
    @Param('id') id: string,
    @Body() body: AddPriceListPriceRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PriceListOutput> {
    const result = await this.addPriceListPrice.execute({ priceListId: id, ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  @Patch(':id/prices/:priceId')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Actualiza un precio override de variante' })
  @ApiOkResponse({ description: 'Lista de precios actualizada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos o rango de cantidades inválido' })
  @ApiNotFoundResponse({ description: 'La lista de precios o el precio no existen' })
  async updatePrice(
    @Param('id') id: string,
    @Param('priceId') priceId: string,
    @Body() body: UpdatePriceListPriceRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PriceListOutput> {
    const result = await this.updatePriceListPrice.execute({ priceListId: id, priceId, ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  @Delete(':id/prices/:priceId')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Elimina un precio override de variante' })
  @ApiOkResponse({ description: 'Lista de precios actualizada' })
  @ApiNotFoundResponse({ description: 'La lista de precios o el precio no existen' })
  async removePrice(
    @Param('id') id: string,
    @Param('priceId') priceId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PriceListOutput> {
    const result = await this.removePriceListPrice.execute({ priceListId: id, priceId, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  private handleError(error: Error): never {
    if (
      error instanceof PriceListNotFoundError ||
      error instanceof PriceListPriceNotFoundError ||
      error instanceof ProductVariantNotFoundError
    ) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof InvalidTierPriceRangeError || error instanceof InvalidDateRangeError) {
      throw new BadRequestException(error.message);
    }
    throw new BadRequestException(error.message);
  }
}
