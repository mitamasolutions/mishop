import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, NoStoreScope, RequirePermission, type AuthenticatedUser } from '@mitama/contracts';
import { CreateCollectionUseCase } from '../application/create-collection/create-collection.use-case';
import { UpdateCollectionUseCase } from '../application/update-collection/update-collection.use-case';
import { ListCollectionsUseCase } from '../application/list-collections/list-collections.use-case';
import { GetCollectionUseCase } from '../application/get-collection/get-collection.use-case';
import type { ProductCollectionOutput } from '../application/product-collection.dto';
import { CollectionHandleAlreadyInUseError, CollectionNotFoundError } from '../domain/errors';
import { CreateCollectionRequestDto } from './dto/create-collection.request.dto';
import { UpdateCollectionRequestDto } from './dto/update-collection.request.dto';

@ApiTags('catalog-collections')
@Controller('catalog/collections')
@NoStoreScope()
@RequirePermission('collections.read')
export class CollectionsController {
  constructor(
    private readonly createCollection: CreateCollectionUseCase,
    private readonly updateCollection: UpdateCollectionUseCase,
    private readonly listCollections: ListCollectionsUseCase,
    private readonly getCollection: GetCollectionUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista las colecciones' })
  @ApiOkResponse({ description: 'Listado de colecciones' })
  async list(): Promise<ProductCollectionOutput[]> {
    const result = await this.listCollections.execute();
    return result.unwrapOr([]);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una colección por id' })
  @ApiOkResponse({ description: 'Colección encontrada' })
  @ApiNotFoundResponse({ description: 'La colección no existe' })
  async get(@Param('id') id: string): Promise<ProductCollectionOutput> {
    const result = await this.getCollection.execute(id);
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }

  @Post()
  @RequirePermission('collections.create')
  @ApiOperation({ summary: 'Crea una colección' })
  @ApiCreatedResponse({ description: 'Colección creada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({ description: 'El slug ya está en uso' })
  async create(
    @Body() body: CreateCollectionRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductCollectionOutput> {
    const result = await this.createCollection.execute({ ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof CollectionHandleAlreadyInUseError) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    return result.value;
  }

  @Patch(':id')
  @RequirePermission('collections.update')
  @ApiOperation({ summary: 'Actualiza una colección' })
  @ApiOkResponse({ description: 'Colección actualizada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'La colección no existe' })
  @ApiConflictResponse({ description: 'El slug ya está en uso' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCollectionRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductCollectionOutput> {
    const result = await this.updateCollection.execute({ id, ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof CollectionNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof CollectionHandleAlreadyInUseError) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    return result.value;
  }
}
