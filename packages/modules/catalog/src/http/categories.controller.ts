import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
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
import { CreateCategoryUseCase } from '../application/create-category/create-category.use-case';
import { UpdateCategoryUseCase } from '../application/update-category/update-category.use-case';
import { MoveCategoryUseCase } from '../application/move-category/move-category.use-case';
import { DeleteCategoryUseCase } from '../application/delete-category/delete-category.use-case';
import { ListCategoriesUseCase } from '../application/list-categories/list-categories.use-case';
import { GetCategoryUseCase } from '../application/get-category/get-category.use-case';
import type { ProductCategoryOutput } from '../application/product-category.dto';
import { CategoryHandleAlreadyInUseError, ProductCategoryNotFoundError } from '../domain/errors';
import { CreateCategoryRequestDto } from './dto/create-category.request.dto';
import { UpdateCategoryRequestDto } from './dto/update-category.request.dto';
import { MoveCategoryRequestDto } from './dto/move-category.request.dto';

@ApiTags('catalog-categories')
@Controller('catalog/categories')
@NoStoreScope()
@RequirePermission('categories.read')
export class CategoriesController {
  constructor(
    private readonly createCategory: CreateCategoryUseCase,
    private readonly updateCategory: UpdateCategoryUseCase,
    private readonly moveCategory: MoveCategoryUseCase,
    private readonly deleteCategory: DeleteCategoryUseCase,
    private readonly listCategories: ListCategoriesUseCase,
    private readonly getCategory: GetCategoryUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista las categorías (plano, la UI construye el árbol)' })
  @ApiOkResponse({ description: 'Listado de categorías' })
  async list(): Promise<ProductCategoryOutput[]> {
    const result = await this.listCategories.execute();
    return result.unwrapOr([]);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una categoría por id' })
  @ApiOkResponse({ description: 'Categoría encontrada' })
  @ApiNotFoundResponse({ description: 'La categoría no existe' })
  async get(@Param('id') id: string): Promise<ProductCategoryOutput> {
    const result = await this.getCategory.execute(id);
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }

  @Post()
  @RequirePermission('categories.create')
  @ApiOperation({ summary: 'Crea una categoría' })
  @ApiCreatedResponse({ description: 'Categoría creada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({ description: 'El slug ya está en uso' })
  @ApiNotFoundResponse({ description: 'La categoría padre no existe' })
  async create(
    @Body() body: CreateCategoryRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductCategoryOutput> {
    const result = await this.createCategory.execute({ ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof CategoryHandleAlreadyInUseError) {
        throw new ConflictException(error.message);
      }
      if (error instanceof ProductCategoryNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    return result.value;
  }

  @Patch(':id')
  @RequirePermission('categories.update')
  @ApiOperation({ summary: 'Actualiza una categoría' })
  @ApiOkResponse({ description: 'Categoría actualizada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'La categoría no existe' })
  @ApiConflictResponse({ description: 'El slug ya está en uso' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCategoryRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductCategoryOutput> {
    const result = await this.updateCategory.execute({ id, ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof ProductCategoryNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof CategoryHandleAlreadyInUseError) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    return result.value;
  }

  @Patch(':id/move')
  @RequirePermission('categories.update')
  @ApiOperation({ summary: 'Mueve una categoría en el árbol (drag & drop): cambia padre y/o rango' })
  @ApiOkResponse({ description: 'Categoría movida' })
  @ApiBadRequestResponse({ description: 'Padre inválido' })
  @ApiNotFoundResponse({ description: 'La categoría o el padre no existen' })
  async move(
    @Param('id') id: string,
    @Body() body: MoveCategoryRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductCategoryOutput> {
    const result = await this.moveCategory.execute({ id, ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof ProductCategoryNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    return result.value;
  }

  @Delete(':id')
  @RequirePermission('categories.delete')
  @ApiOperation({ summary: 'Elimina una categoría; sus hijos suben un nivel en el árbol' })
  @ApiOkResponse({ description: 'Categoría eliminada' })
  @ApiNotFoundResponse({ description: 'La categoría no existe' })
  async remove(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser): Promise<{ success: true }> {
    const result = await this.deleteCategory.execute({ id, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return { success: true };
  }
}
