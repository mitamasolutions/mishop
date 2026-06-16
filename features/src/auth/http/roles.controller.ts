import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, NoStoreScope, RequirePermission, type AuthenticatedUser } from '@mitama/contracts';
import { CreateRoleUseCase } from '../application/create-role/create-role.use-case';
import { UpdateRoleUseCase } from '../application/update-role/update-role.use-case';
import { DeleteRoleUseCase } from '../application/delete-role/delete-role.use-case';
import { ListRolesUseCase } from '../application/list-roles/list-roles.use-case';
import { GetRoleUseCase } from '../application/get-role/get-role.use-case';
import type { CreateRoleOutput } from '../application/create-role/create-role.dto';
import type { RoleOutput } from '../application/list-roles/list-roles.dto';
import {
  InvalidPermissionError,
  RoleInUseError,
  RoleNameAlreadyInUseError,
  RoleNotFoundError,
  SystemRoleNotEditableError,
} from '../domain/errors';
import { ValidationError } from '@mitama/core';
import { CreateRoleRequestDto } from './dto/create-role.request.dto';
import { UpdateRoleRequestDto } from './dto/update-role.request.dto';

@ApiTags('roles')
@Controller('roles')
@NoStoreScope()
export class RolesController {
  constructor(
    private readonly createRole: CreateRoleUseCase,
    private readonly updateRole: UpdateRoleUseCase,
    private readonly deleteRole: DeleteRoleUseCase,
    private readonly listRoles: ListRolesUseCase,
    private readonly getRole: GetRoleUseCase,
  ) {}

  @Get()
  @RequirePermission('roles.read')
  @ApiOperation({ summary: 'Lista los roles' })
  @ApiOkResponse({ description: 'Listado de roles' })
  async list(): Promise<RoleOutput[]> {
    const result = await this.listRoles.execute();
    return result.unwrapOr([]);
  }

  @Get(':id')
  @RequirePermission('roles.read')
  @ApiOperation({ summary: 'Obtiene un rol por id' })
  @ApiOkResponse({ description: 'Rol encontrado' })
  @ApiNotFoundResponse({ description: 'El rol no existe' })
  async get(@Param('id') id: string): Promise<RoleOutput> {
    const result = await this.getRole.execute(id);
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }

  @Post()
  @RequirePermission('roles.create')
  @ApiOperation({ summary: 'Crea un rol personalizado' })
  @ApiCreatedResponse({ description: 'Rol creado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({ description: 'Ya existe un rol con ese nombre' })
  async create(
    @Body() body: CreateRoleRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<CreateRoleOutput> {
    const result = await this.createRole.execute({
      name: body.name,
      permissions: body.permissions,
      actorUserId: user?.id ?? '',
    });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof RoleNameAlreadyInUseError) {
        throw new ConflictException(error.message);
      }
      if (error instanceof ValidationError || error instanceof InvalidPermissionError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException((error as Error).message);
    }
    return result.value;
  }

  @Patch(':id')
  @RequirePermission('roles.update')
  @ApiOperation({ summary: 'Edita el nombre y/o permisos de un rol personalizado' })
  @ApiOkResponse({ description: 'Rol actualizado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'El rol no existe' })
  @ApiForbiddenResponse({ description: 'El rol Super Admin no se puede editar' })
  @ApiConflictResponse({ description: 'Ya existe un rol con ese nombre' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateRoleRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<void> {
    const result = await this.updateRole.execute({
      roleId: id,
      name: body.name,
      permissions: body.permissions,
      actorUserId: user?.id ?? '',
    });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof RoleNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof SystemRoleNotEditableError) {
        throw new ForbiddenException(error.message);
      }
      if (error instanceof RoleNameAlreadyInUseError) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('roles.delete')
  @ApiOperation({ summary: 'Borra un rol personalizado' })
  @ApiOkResponse({ description: 'Rol borrado' })
  @ApiNotFoundResponse({ description: 'El rol no existe' })
  @ApiForbiddenResponse({ description: 'El rol Super Admin no se puede borrar' })
  @ApiConflictResponse({ description: 'El rol está en uso' })
  async delete(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser): Promise<void> {
    const result = await this.deleteRole.execute({ roleId: id, actorUserId: user?.id ?? '' });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof RoleNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof SystemRoleNotEditableError) {
        throw new ForbiddenException(error.message);
      }
      if (error instanceof RoleInUseError) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException((error as Error).message);
    }
  }
}
