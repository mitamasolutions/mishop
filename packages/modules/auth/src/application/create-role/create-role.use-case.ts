import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { isPermission, type Permission } from '@mitama/contracts';
import { InvalidPermissionError, RoleNameAlreadyInUseError } from '../../domain/errors';
import { Role } from '../../domain/role.entity';
import type { RoleRepository } from '../../domain/role.repository';
import type { CreateRoleInput, CreateRoleOutput } from './create-role.dto';

export type CreateRoleError = ValidationError | RoleNameAlreadyInUseError | InvalidPermissionError;

/** Crea un rol personalizado (nunca `isSystem`) con un subconjunto del catálogo de permisos. */
export class CreateRoleUseCase implements UseCase<CreateRoleInput, Result<CreateRoleOutput, CreateRoleError>> {
  constructor(private readonly roles: RoleRepository) {}

  async execute(input: CreateRoleInput): Promise<Result<CreateRoleOutput, CreateRoleError>> {
    const name = input.name.trim();
    if (!name) {
      return err(new ValidationError('El nombre del rol es obligatorio'));
    }

    const existing = await this.roles.findByName(name);
    if (existing) {
      return err(new RoleNameAlreadyInUseError(name));
    }

    const permissions: Permission[] = [];
    for (const permission of input.permissions) {
      if (!isPermission(permission)) {
        return err(new InvalidPermissionError(permission));
      }
      permissions.push(permission);
    }

    const role = Role.create({ name, permissions });

    await this.roles.create(role, {
      userId: input.actorUserId,
      storeId: null,
      action: 'role.created',
      entityType: 'role',
      entityId: role.id,
    });

    return ok({ roleId: role.id });
  }
}
