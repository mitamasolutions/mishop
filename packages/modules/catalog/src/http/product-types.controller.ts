import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
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
import { CurrentUser, NoStoreScope, type AuthenticatedUser } from '@mitama/contracts';
import {
  CreateValueTaxonomyUseCase,
  DeleteValueTaxonomyUseCase,
  GetValueTaxonomyUseCase,
  ListValueTaxonomyUseCase,
  UpdateValueTaxonomyUseCase,
} from '../application/value-taxonomy.use-cases';
import type { ValueTaxonomyOutput } from '../application/value-taxonomy.dto';
import { ValueAlreadyInUseError, ValueTaxonomyNotFoundError } from '../domain/errors';
import { ValueTaxonomyRequestDto } from './dto/value-taxonomy.request.dto';
import { CATALOG_TOKENS } from '../catalog.tokens';

@ApiTags('catalog-product-types')
@Controller('catalog/product-types')
@NoStoreScope()
export class ProductTypesController {
  constructor(
    @Inject(CATALOG_TOKENS.createProductTypeUseCase) private readonly createUseCase: CreateValueTaxonomyUseCase,
    @Inject(CATALOG_TOKENS.updateProductTypeUseCase) private readonly updateUseCase: UpdateValueTaxonomyUseCase,
    @Inject(CATALOG_TOKENS.deleteProductTypeUseCase) private readonly deleteUseCase: DeleteValueTaxonomyUseCase,
    @Inject(CATALOG_TOKENS.listProductTypeUseCase) private readonly listUseCase: ListValueTaxonomyUseCase,
    @Inject(CATALOG_TOKENS.getProductTypeUseCase) private readonly getUseCase: GetValueTaxonomyUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista los tipos de producto' })
  @ApiOkResponse({ description: 'Listado de tipos de producto' })
  async list(): Promise<ValueTaxonomyOutput[]> {
    const result = await this.listUseCase.execute();
    return result.unwrapOr([]);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un tipo de producto por id' })
  @ApiOkResponse({ description: 'Tipo de producto encontrado' })
  @ApiNotFoundResponse({ description: 'El tipo de producto no existe' })
  async get(@Param('id') id: string): Promise<ValueTaxonomyOutput> {
    const result = await this.getUseCase.execute(id);
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }

  @Post()
  @ApiOperation({ summary: 'Crea un tipo de producto' })
  @ApiCreatedResponse({ description: 'Tipo de producto creado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({ description: 'El valor ya existe' })
  async create(
    @Body() body: ValueTaxonomyRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ValueTaxonomyOutput> {
    const result = await this.createUseCase.execute({ value: body.value, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof ValueAlreadyInUseError) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    return result.value;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Renombra un tipo de producto' })
  @ApiOkResponse({ description: 'Tipo de producto actualizado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'El tipo de producto no existe' })
  @ApiConflictResponse({ description: 'El valor ya existe' })
  async update(
    @Param('id') id: string,
    @Body() body: ValueTaxonomyRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ValueTaxonomyOutput> {
    const result = await this.updateUseCase.execute({ id, value: body.value, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof ValueTaxonomyNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof ValueAlreadyInUseError) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    return result.value;
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina un tipo de producto' })
  @ApiNoContentResponse({ description: 'Tipo de producto eliminado' })
  @ApiNotFoundResponse({ description: 'El tipo de producto no existe' })
  async remove(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser): Promise<void> {
    const result = await this.deleteUseCase.execute({ id, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
  }
}
