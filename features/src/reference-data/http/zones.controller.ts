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
import { CreateZoneUseCase } from '../application/zone/create-zone.use-case';
import { UpdateZoneUseCase } from '../application/zone/update-zone.use-case';
import { DeactivateZoneUseCase } from '../application/zone/deactivate-zone.use-case';
import { GetZoneUseCase, ListZonesByTerritoryUseCase } from '../application/zone/query-zone.use-case';
import type { CreateZoneOutput, ZoneOutput } from '../application/zone/zone.dto';
import {
  DuplicateZoneCodeError,
  TerritoryNotFoundError,
  ZoneNotFoundError,
} from '../domain/errors';
import { CreateZoneRequestDto, UpdateZoneRequestDto } from './dto/zone.request.dto';

@ApiTags('zones')
@Controller()
@NoStoreScope()
export class ZonesController {
  constructor(
    private readonly createZoneUseCase: CreateZoneUseCase,
    private readonly updateZoneUseCase: UpdateZoneUseCase,
    private readonly deactivateZoneUseCase: DeactivateZoneUseCase,
    private readonly getZoneUseCase: GetZoneUseCase,
    private readonly listZonesByTerritory: ListZonesByTerritoryUseCase,
  ) {}

  @Get('territories/:territoryId/zones')
  @RequirePermission('zones.read')
  @ApiOperation({ summary: 'Lista las zonas de un territorio' })
  @ApiOkResponse({ description: 'Listado de zonas' })
  async list(@Param('territoryId') territoryId: string): Promise<ZoneOutput[]> {
    const result = await this.listZonesByTerritory.execute(territoryId);
    return result.unwrapOr([]);
  }

  @Post('territories/:territoryId/zones')
  @RequirePermission('zones.create')
  @ApiOperation({ summary: 'Crea una zona dentro de un territorio' })
  @ApiCreatedResponse({ description: 'Zona creada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'El territorio no existe' })
  @ApiConflictResponse({ description: 'El código ya existe en este territorio' })
  async create(
    @Param('territoryId') territoryId: string,
    @Body() body: CreateZoneRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<CreateZoneOutput> {
    const result = await this.createZoneUseCase.execute({
      territoryId,
      name: body.name,
      code: body.code,
      description: body.description,
      actorUserId: user?.id ?? '',
    });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof TerritoryNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof DuplicateZoneCodeError) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    return result.value;
  }

  @Get('zones/:id')
  @RequirePermission('zones.read')
  @ApiOperation({ summary: 'Obtiene una zona por id' })
  @ApiOkResponse({ description: 'Zona encontrada' })
  @ApiNotFoundResponse({ description: 'La zona no existe' })
  async get(@Param('id') id: string): Promise<ZoneOutput> {
    const result = await this.getZoneUseCase.execute(id);
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }

  @Patch('zones/:id')
  @RequirePermission('zones.update')
  @ApiOperation({ summary: 'Actualiza una zona' })
  @ApiOkResponse({ description: 'Zona actualizada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'La zona no existe' })
  @ApiConflictResponse({ description: 'El código ya existe en el territorio' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateZoneRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<void> {
    const result = await this.updateZoneUseCase.execute({
      zoneId: id,
      name: body.name,
      code: body.code,
      isActive: body.isActive,
      description: body.description,
      actorUserId: user?.id ?? '',
    });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof ZoneNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof DuplicateZoneCodeError) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  @Delete('zones/:id')
  @HttpCode(204)
  @RequirePermission('zones.delete')
  @ApiOperation({ summary: 'Desactiva (soft delete) una zona' })
  @ApiNoContentResponse({ description: 'Zona desactivada' })
  @ApiNotFoundResponse({ description: 'La zona no existe' })
  async deactivate(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser): Promise<void> {
    const result = await this.deactivateZoneUseCase.execute({
      zoneId: id,
      actorUserId: user?.id ?? '',
    });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof ZoneNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException((error as Error).message);
    }
  }
}
