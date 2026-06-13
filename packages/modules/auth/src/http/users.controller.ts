import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Delete,
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
import { InviteUserUseCase } from '../application/invite-user/invite-user.use-case';
import { ListUsersUseCase } from '../application/list-users/list-users.use-case';
import { GetUserUseCase } from '../application/get-user/get-user.use-case';
import { UpdateUserStatusUseCase } from '../application/update-user-status/update-user-status.use-case';
import { AssignUserStoreRoleUseCase } from '../application/assign-user-store-role/assign-user-store-role.use-case';
import { RemoveUserStoreRoleUseCase } from '../application/remove-user-store-role/remove-user-store-role.use-case';
import type { InviteUserOutput } from '../application/invite-user/invite-user.dto';
import type { AssignUserStoreRoleOutput } from '../application/assign-user-store-role/assign-user-store-role.dto';
import type { UserOutput } from '../application/user.dto';
import {
  EmailAlreadyInUseError,
  LastSuperAdminError,
  RoleNotFoundError,
  UserNotFoundError,
  UserStoreRoleAlreadyExistsError,
  UserStoreRoleNotFoundError,
} from '../domain/errors';
import { ValidationError } from '@mitama/core';
import { InviteUserRequestDto } from './dto/invite-user.request.dto';
import { UpdateUserStatusRequestDto } from './dto/update-user-status.request.dto';
import { AssignUserStoreRoleRequestDto } from './dto/assign-user-store-role.request.dto';

@ApiTags('users')
@Controller('users')
@NoStoreScope()
export class UsersController {
  constructor(
    private readonly inviteUser: InviteUserUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly updateUserStatus: UpdateUserStatusUseCase,
    private readonly assignUserStoreRole: AssignUserStoreRoleUseCase,
    private readonly removeUserStoreRole: RemoveUserStoreRoleUseCase,
  ) {}

  @Get()
  @RequirePermission('users.read')
  @ApiOperation({ summary: 'Lista los usuarios' })
  @ApiOkResponse({ description: 'Listado de usuarios' })
  async list(): Promise<UserOutput[]> {
    const result = await this.listUsers.execute();
    return result.unwrapOr([]);
  }

  @Get(':id')
  @RequirePermission('users.read')
  @ApiOperation({ summary: 'Obtiene un usuario por id' })
  @ApiOkResponse({ description: 'Usuario encontrado' })
  @ApiNotFoundResponse({ description: 'El usuario no existe' })
  async get(@Param('id') id: string): Promise<UserOutput> {
    const result = await this.getUser.execute(id);
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }

  @Post('invite')
  @RequirePermission('users.invite')
  @ApiOperation({ summary: 'Invita a un nuevo usuario con un rol asignado' })
  @ApiCreatedResponse({ description: 'Invitación creada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({ description: 'El email ya está registrado' })
  @ApiNotFoundResponse({ description: 'El rol no existe' })
  async invite(
    @Body() body: InviteUserRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<InviteUserOutput> {
    const result = await this.inviteUser.execute({
      email: body.email,
      name: body.name,
      roleId: body.roleId,
      storeId: body.storeId ?? null,
      actorUserId: user?.id ?? '',
    });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof EmailAlreadyInUseError) {
        throw new ConflictException(error.message);
      }
      if (error instanceof RoleNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    return result.value;
  }

  @Patch(':id/status')
  @RequirePermission('users.update')
  @ApiOperation({ summary: 'Cambia el estado de un usuario' })
  @ApiOkResponse({ description: 'Estado actualizado' })
  @ApiNotFoundResponse({ description: 'El usuario no existe' })
  @ApiForbiddenResponse({ description: 'No se puede desactivar al último Super Admin' })
  async setStatus(
    @Param('id') id: string,
    @Body() body: UpdateUserStatusRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<void> {
    const result = await this.updateUserStatus.execute({
      userId: id,
      status: body.status,
      actorUserId: user?.id ?? '',
    });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof UserNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof LastSuperAdminError) {
        throw new ForbiddenException(error.message);
      }
      throw new BadRequestException((error as Error).message);
    }
  }

  @Post('store-roles')
  @RequirePermission('users.update')
  @ApiOperation({ summary: 'Asigna un rol a un usuario en una tienda (o globalmente para Super Admin)' })
  @ApiCreatedResponse({ description: 'Asignación creada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'El usuario o el rol no existen' })
  @ApiConflictResponse({ description: 'El usuario ya tiene asignado ese rol en esa tienda' })
  async assignStoreRole(
    @Body() body: AssignUserStoreRoleRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<AssignUserStoreRoleOutput> {
    const result = await this.assignUserStoreRole.execute({
      userId: body.userId,
      roleId: body.roleId,
      storeId: body.storeId ?? null,
      actorUserId: user?.id ?? '',
    });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof UserNotFoundError || error instanceof RoleNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof UserStoreRoleAlreadyExistsError) {
        throw new ConflictException(error.message);
      }
      if (error instanceof ValidationError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException((error as Error).message);
    }
    return result.value;
  }

  @Delete('store-roles/:assignmentId')
  @HttpCode(204)
  @RequirePermission('users.update')
  @ApiOperation({ summary: 'Quita una asignación de rol de un usuario' })
  @ApiOkResponse({ description: 'Asignación eliminada' })
  @ApiNotFoundResponse({ description: 'La asignación no existe' })
  @ApiForbiddenResponse({ description: 'No se puede quitar el rol al último Super Admin' })
  async removeStoreRole(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<void> {
    const result = await this.removeUserStoreRole.execute({
      assignmentId,
      actorUserId: user?.id ?? '',
    });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof UserStoreRoleNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof LastSuperAdminError) {
        throw new ForbiddenException(error.message);
      }
      throw new BadRequestException((error as Error).message);
    }
  }
}
