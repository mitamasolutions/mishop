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
import { CurrentUser, RequirePermission, type AuthenticatedUser } from '@mitama/contracts';
import { CreateBrandUseCase } from '../application/create-brand/create-brand.use-case';
import { UpdateBrandUseCase } from '../application/update-brand/update-brand.use-case';
import { SetBrandStatusUseCase } from '../application/set-brand-status/set-brand-status.use-case';
import { ListBrandsUseCase } from '../application/list-brands/list-brands.use-case';
import { GetBrandUseCase } from '../application/get-brand/get-brand.use-case';
import type { BrandOutput } from '../application/brand.dto';
import { BrandHandleAlreadyInUseError, BrandNotFoundError } from '../domain/errors';
import { CreateBrandRequestDto } from './dto/create-brand.request.dto';
import { UpdateBrandRequestDto } from './dto/update-brand.request.dto';
import { SetBrandStatusRequestDto } from './dto/set-brand-status.request.dto';

@ApiTags('catalog-brands')
@Controller('catalog/brands')
@RequirePermission('brands.read')
export class BrandsController {
  constructor(
    private readonly createBrand: CreateBrandUseCase,
    private readonly updateBrand: UpdateBrandUseCase,
    private readonly setBrandStatus: SetBrandStatusUseCase,
    private readonly listBrands: ListBrandsUseCase,
    private readonly getBrand: GetBrandUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista las marcas' })
  @ApiOkResponse({ description: 'Listado de marcas' })
  async list(): Promise<BrandOutput[]> {
    const result = await this.listBrands.execute();
    return result.unwrapOr([]);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una marca por id' })
  @ApiOkResponse({ description: 'Marca encontrada' })
  @ApiNotFoundResponse({ description: 'La marca no existe' })
  async get(@Param('id') id: string): Promise<BrandOutput> {
    const result = await this.getBrand.execute(id);
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }

  @Post()
  @RequirePermission('brands.create')
  @ApiOperation({ summary: 'Crea una marca' })
  @ApiCreatedResponse({ description: 'Marca creada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({ description: 'El slug ya está en uso' })
  async create(
    @Body() body: CreateBrandRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<BrandOutput> {
    const result = await this.createBrand.execute({ ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof BrandHandleAlreadyInUseError) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    return result.value;
  }

  @Patch(':id')
  @RequirePermission('brands.update')
  @ApiOperation({ summary: 'Actualiza una marca' })
  @ApiOkResponse({ description: 'Marca actualizada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'La marca no existe' })
  @ApiConflictResponse({ description: 'El slug ya está en uso' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateBrandRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<BrandOutput> {
    const result = await this.updateBrand.execute({ id, ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof BrandNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof BrandHandleAlreadyInUseError) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    return result.value;
  }

  @Patch(':id/status')
  @RequirePermission('brands.update')
  @ApiOperation({ summary: 'Activa o desactiva una marca' })
  @ApiOkResponse({ description: 'Estado actualizado' })
  @ApiNotFoundResponse({ description: 'La marca no existe' })
  async setStatus(
    @Param('id') id: string,
    @Body() body: SetBrandStatusRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<BrandOutput> {
    const result = await this.setBrandStatus.execute({
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
