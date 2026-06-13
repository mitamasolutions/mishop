import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { isPermission, type Permission } from '@mitama/contracts';
import {
  InvalidPermissionError,
  RoleNameAlreadyInUseError,
  RoleNotFoundError,
  SystemRoleNotEditableError,
} from '../../domain/errors';
import type { RoleRepository } from '../../domain/role.repository';
import type { UpdateRoleInput } from './update-role.dto';

export type UpdateRoleError =
  | ValidationError
  | RoleNotFoundError
  | SystemRoleNotEditableError
  | RoleNameAlreadyInUseError
  | InvalidPermissionError;

/** Edita nombre y/o permisos de un rol personalizado. El rol Super Admin no es editable. */
export class UpdateRoleUseCase implements UseCase<UpdateRoleInput, Result<void, UpdateRoleError>> {
  constructor(private readonly roles: RoleRepository) {}

  async execute(input: UpdateRoleInput): Promise<Result<void, UpdateRoleError>> {
    const role = await this.roles.findById(input.roleId);
    if (!role) {
      return err(new RoleNotFoundError(input.roleId));
    }

    if (role.isSystem) {
      return err(new SystemRoleNotEditableError());
    }

    let name: string | undefined;
    if (input.name !== undefined) {
      name = input.name.trim();
      if (!name) {
        return err(new ValidationError('El nombre del rol es obligatorio'));
      }
      const existing = await this.roles.findByName(name);
      if (existing && existing.id !== role.id) {
        return err(new RoleNameAlreadyInUseError(name));
      }
    }

    let permissions: Permission[] | undefined;
    if (input.permissions !== undefined) {
      permissions = [];
      for (const permission of input.permissions) {
        if (!isPermission(permission)) {
          return err(new InvalidPermissionError(permission));
        }
        permissions.push(permission);
      }
    }

    role.update({ name, permissions });

    await this.roles.update(role, {
      userId: input.actorUserId,
      storeId: null,
      action: 'role.updated',
      entityType: 'role',
      entityId: role.id,
    });

    return ok(undefined);
  }
}
