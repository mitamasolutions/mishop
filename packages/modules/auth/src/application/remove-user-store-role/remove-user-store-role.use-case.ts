import { err, ok, Result, UseCase } from '@mitama/core';
import { LastSuperAdminError, UserStoreRoleNotFoundError } from '../../domain/errors';
import type { RoleRepository } from '../../domain/role.repository';
import type { UserStoreRoleRepository } from '../../domain/user-store-role.repository';
import type { RemoveUserStoreRoleInput } from './remove-user-store-role.dto';

export type RemoveUserStoreRoleError = UserStoreRoleNotFoundError | LastSuperAdminError;

/** Quita una asignación usuario↔rol, protegiendo al último Super Admin global. */
export class RemoveUserStoreRoleUseCase
  implements UseCase<RemoveUserStoreRoleInput, Result<void, RemoveUserStoreRoleError>>
{
  constructor(
    private readonly roles: RoleRepository,
    private readonly userStoreRoles: UserStoreRoleRepository,
  ) {}

  async execute(input: RemoveUserStoreRoleInput): Promise<Result<void, RemoveUserStoreRoleError>> {
    const assignment = await this.userStoreRoles.findById(input.assignmentId);
    if (!assignment) {
      return err(new UserStoreRoleNotFoundError(input.assignmentId));
    }

    if (assignment.storeId === null) {
      const systemRole = await this.roles.findSystemRole();
      if (systemRole && assignment.roleId === systemRole.id) {
        const globalCount = await this.userStoreRoles.countGlobalAssignments(systemRole.id);
        if (globalCount <= 1) {
          return err(new LastSuperAdminError());
        }
      }
    }

    await this.userStoreRoles.delete(assignment.id, {
      userId: input.actorUserId,
      storeId: assignment.storeId,
      action: 'user.role_removed',
      entityType: 'user',
      entityId: assignment.userId,
    });

    return ok(undefined);
  }
}
