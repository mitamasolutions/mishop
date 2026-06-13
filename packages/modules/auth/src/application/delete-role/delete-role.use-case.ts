import { err, ok, Result, UseCase } from '@mitama/core';
import { RoleInUseError, RoleNotFoundError, SystemRoleNotEditableError } from '../../domain/errors';
import type { RoleRepository } from '../../domain/role.repository';
import type { UserStoreRoleRepository } from '../../domain/user-store-role.repository';
import type { DeleteRoleInput } from './delete-role.dto';

export type DeleteRoleError = RoleNotFoundError | SystemRoleNotEditableError | RoleInUseError;

/** Borra un rol personalizado, salvo que sea de sistema o esté asignado a algún usuario. */
export class DeleteRoleUseCase implements UseCase<DeleteRoleInput, Result<void, DeleteRoleError>> {
  constructor(
    private readonly roles: RoleRepository,
    private readonly userStoreRoles: UserStoreRoleRepository,
  ) {}

  async execute(input: DeleteRoleInput): Promise<Result<void, DeleteRoleError>> {
    const role = await this.roles.findById(input.roleId);
    if (!role) {
      return err(new RoleNotFoundError(input.roleId));
    }

    if (role.isSystem) {
      return err(new SystemRoleNotEditableError());
    }

    const assignments = await this.userStoreRoles.findByRoleId(role.id);
    if (assignments.length > 0) {
      return err(new RoleInUseError());
    }

    await this.roles.delete(role.id, {
      userId: input.actorUserId,
      storeId: null,
      action: 'role.deleted',
      entityType: 'role',
      entityId: role.id,
    });

    return ok(undefined);
  }
}
