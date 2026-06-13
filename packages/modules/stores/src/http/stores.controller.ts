import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
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
import { CreateStoreUseCase } from '../application/create-store/create-store.use-case';
import { UpdateStoreUseCase } from '../application/update-store/update-store.use-case';
import { SetStoreStatusUseCase } from '../application/set-store-status/set-store-status.use-case';
import { ListStoresUseCase } from '../application/list-stores/list-stores.use-case';
import { GetStoreUseCase } from '../application/get-store/get-store.use-case';
import type { StoreOutput } from '../application/store.dto';
import { StoreCodeAlreadyInUseError, StoreNotFoundError } from '../domain/errors';
import { CreateStoreRequestDto } from './dto/create-store.request.dto';
import { UpdateStoreRequestDto } from './dto/update-store.request.dto';
import { SetStoreStatusRequestDto } from './dto/set-store-status.request.dto';

@ApiTags('stores')
@Controller('stores')
@NoStoreScope()
export class StoresController {
  constructor(
    private readonly createStore: CreateStoreUseCase,
    private readonly updateStore: UpdateStoreUseCase,
    private readonly setStoreStatus: SetStoreStatusUseCase,
    private readonly listStores: ListStoresUseCase,
    private readonly getStore: GetStoreUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista las tiendas' })
  @ApiOkResponse({ description: 'Listado de tiendas' })
  async list(): Promise<StoreOutput[]> {
    const result = await this.listStores.execute();
    return result.unwrapOr([]);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una tienda por id' })
  @ApiOkResponse({ description: 'Tienda encontrada' })
  @ApiNotFoundResponse({ description: 'La tienda no existe' })
  async get(@Param('id') id: string): Promise<StoreOutput> {
    const result = await this.getStore.execute(id);
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }

  @Post()
  @ApiOperation({ summary: 'Crea una tienda' })
  @ApiCreatedResponse({ description: 'Tienda creada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({ description: 'El código ya está en uso' })
  async create(
    @Body() body: CreateStoreRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<StoreOutput> {
    const result = await this.createStore.execute({
      ...body,
      url: body.url ?? null,
      actorUserId: user?.id ?? null,
    });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof StoreCodeAlreadyInUseError) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    return result.value;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza una tienda' })
  @ApiOkResponse({ description: 'Tienda actualizada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'La tienda no existe' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateStoreRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<StoreOutput> {
    const result = await this.updateStore.execute({ id, ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof StoreNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    return result.value;
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activa o desactiva una tienda' })
  @ApiOkResponse({ description: 'Estado actualizado' })
  @ApiNotFoundResponse({ description: 'La tienda no existe' })
  async setStatus(
    @Param('id') id: string,
    @Body() body: SetStoreStatusRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<StoreOutput> {
    const result = await this.setStoreStatus.execute({
      id,
      isActive: body.isActive,
      actorUserId: user?.id ?? null,
    });
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }
}
