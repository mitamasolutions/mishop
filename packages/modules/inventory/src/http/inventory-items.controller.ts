import { BadRequestException, Body, ConflictException, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Put, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, NoStoreScope, type AuthenticatedUser } from '@mitama/contracts';
import { CreateInventoryItemUseCase } from '../application/create-inventory-item/create-inventory-item.use-case';
import { UpdateInventoryItemUseCase } from '../application/update-inventory-item/update-inventory-item.use-case';
import { GetInventoryItemUseCase } from '../application/get-inventory-item/get-inventory-item.use-case';
import { GetInventoryItemByVariantUseCase } from '../application/get-inventory-item-by-variant/get-inventory-item-by-variant.use-case';
import { ListInventoryItemsUseCase, type ListInventoryItemsOutput } from '../application/list-inventory-items/list-inventory-items.use-case';
import { SetInventoryLevelUseCase } from '../application/set-inventory-level/set-inventory-level.use-case';
import { RemoveInventoryLevelUseCase } from '../application/remove-inventory-level/remove-inventory-level.use-case';
import type { InventoryItemOutput } from '../application/inventory-item.dto';
import {
  InventoryItemNotFoundError,
  InventoryItemSkuAlreadyInUseError,
  StockLocationNotFoundError,
  VariantAlreadyLinkedError,
} from '../domain/errors';
import { CreateInventoryItemRequestDto } from './dto/create-inventory-item.request.dto';
import { UpdateInventoryItemRequestDto } from './dto/update-inventory-item.request.dto';
import { ListInventoryItemsRequestDto } from './dto/list-inventory-items.request.dto';
import { SetInventoryLevelRequestDto } from './dto/set-inventory-level.request.dto';

@ApiTags('inventory')
@Controller('inventory/items')
@NoStoreScope()
export class InventoryItemsController {
  constructor(
    private readonly createItem: CreateInventoryItemUseCase,
    private readonly updateItem: UpdateInventoryItemUseCase,
    private readonly getItem: GetInventoryItemUseCase,
    private readonly getItemByVariant: GetInventoryItemByVariantUseCase,
    private readonly listItems: ListInventoryItemsUseCase,
    private readonly setLevel: SetInventoryLevelUseCase,
    private readonly removeLevel: RemoveInventoryLevelUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista los ítems de inventario' })
  @ApiOkResponse({ description: 'Listado paginado de ítems de inventario' })
  async list(@Query() query: ListInventoryItemsRequestDto): Promise<ListInventoryItemsOutput> {
    const result = await this.listItems.execute(query);
    return result.unwrapOr({ items: [], total: 0, page: query.page ?? 1, pageSize: query.pageSize ?? 20 });
  }

  @Get('by-variant/:variantId')
  @ApiOperation({ summary: 'Obtiene el ítem de inventario vinculado a una variante' })
  @ApiOkResponse({ description: 'Ítem de inventario encontrado' })
  @ApiNotFoundResponse({ description: 'No hay un ítem de inventario vinculado a esa variante' })
  async getByVariant(@Param('variantId') variantId: string): Promise<InventoryItemOutput> {
    const result = await this.getItemByVariant.execute(variantId);
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un ítem de inventario por id' })
  @ApiOkResponse({ description: 'Ítem de inventario encontrado' })
  @ApiNotFoundResponse({ description: 'El ítem de inventario no existe' })
  async get(@Param('id') id: string): Promise<InventoryItemOutput> {
    const result = await this.getItem.execute(id);
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }

  @Post()
  @ApiOperation({ summary: 'Crea un ítem de inventario' })
  @ApiCreatedResponse({ description: 'Ítem de inventario creado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({ description: 'El SKU ya está en uso o la variante ya tiene un ítem vinculado' })
  async create(
    @Body() body: CreateInventoryItemRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<InventoryItemOutput> {
    const result = await this.createItem.execute({ ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof InventoryItemSkuAlreadyInUseError || error instanceof VariantAlreadyLinkedError) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    return result.value;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza un ítem de inventario' })
  @ApiOkResponse({ description: 'Ítem de inventario actualizado' })
  @ApiNotFoundResponse({ description: 'El ítem de inventario no existe' })
  @ApiConflictResponse({ description: 'El SKU ya está en uso' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateInventoryItemRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<InventoryItemOutput> {
    const result = await this.updateItem.execute({ id, ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof InventoryItemNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new ConflictException(error.message);
    }
    return result.value;
  }

  @Put(':id/levels/:locationId')
  @ApiOperation({ summary: 'Establece el nivel de inventario de un ítem en una ubicación' })
  @ApiOkResponse({ description: 'Nivel de inventario actualizado' })
  @ApiBadRequestResponse({ description: 'Cantidad inválida' })
  @ApiNotFoundResponse({ description: 'El ítem de inventario o la ubicación no existen' })
  async setInventoryLevel(
    @Param('id') id: string,
    @Param('locationId') locationId: string,
    @Body() body: SetInventoryLevelRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<InventoryItemOutput> {
    const result = await this.setLevel.execute({
      itemId: id,
      locationId,
      stockedQuantity: body.stockedQuantity,
      incomingQuantity: body.incomingQuantity,
      actorUserId: user?.id ?? null,
    });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof InventoryItemNotFoundError || error instanceof StockLocationNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    return result.value;
  }

  @Delete(':id/levels/:locationId')
  @ApiOperation({ summary: 'Elimina el nivel de inventario de un ítem en una ubicación' })
  @ApiOkResponse({ description: 'Nivel de inventario eliminado' })
  @ApiNotFoundResponse({ description: 'El ítem de inventario o el nivel no existen' })
  async removeInventoryLevel(
    @Param('id') id: string,
    @Param('locationId') locationId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<InventoryItemOutput> {
    const result = await this.removeLevel.execute({ itemId: id, locationId, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }
}
