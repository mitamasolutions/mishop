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
import { CurrentUser, RequirePermission, type AuthenticatedUser } from '@mitama/contracts';
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

@ApiTags('catalog-product-tags')
@Controller('catalog/product-tags')
@RequirePermission('product-tags.read')
export class ProductTagsController {
  constructor(
    @Inject(CATALOG_TOKENS.createProductTagUseCase) private readonly createUseCase: CreateValueTaxonomyUseCase,
    @Inject(CATALOG_TOKENS.updateProductTagUseCase) private readonly updateUseCase: UpdateValueTaxonomyUseCase,
    @Inject(CATALOG_TOKENS.deleteProductTagUseCase) private readonly deleteUseCase: DeleteValueTaxonomyUseCase,
    @Inject(CATALOG_TOKENS.listProductTagUseCase) private readonly listUseCase: ListValueTaxonomyUseCase,
    @Inject(CATALOG_TOKENS.getProductTagUseCase) private readonly getUseCase: GetValueTaxonomyUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista las etiquetas de producto' })
  @ApiOkResponse({ description: 'Listado de etiquetas' })
  async list(): Promise<ValueTaxonomyOutput[]> {
    const result = await this.listUseCase.execute();
    return result.unwrapOr([]);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una etiqueta por id' })
  @ApiOkResponse({ description: 'Etiqueta encontrada' })
  @ApiNotFoundResponse({ description: 'La etiqueta no existe' })
  async get(@Param('id') id: string): Promise<ValueTaxonomyOutput> {
    const result = await this.getUseCase.execute(id);
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }

  @Post()
  @RequirePermission('product-tags.create')
  @ApiOperation({ summary: 'Crea una etiqueta de producto' })
  @ApiCreatedResponse({ description: 'Etiqueta creada' })
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
  @RequirePermission('product-tags.update')
  @ApiOperation({ summary: 'Renombra una etiqueta de producto' })
  @ApiOkResponse({ description: 'Etiqueta actualizada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'La etiqueta no existe' })
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
  @RequirePermission('product-tags.delete')
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina una etiqueta de producto' })
  @ApiNoContentResponse({ description: 'Etiqueta eliminada' })
  @ApiNotFoundResponse({ description: 'La etiqueta no existe' })
  async remove(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser): Promise<void> {
    const result = await this.deleteUseCase.execute({ id, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
  }
}
