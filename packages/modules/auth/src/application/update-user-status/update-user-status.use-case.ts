import { err, ok, Result, UseCase } from '@mitama/core';
import { LastSuperAdminError, UserNotFoundError } from '../../domain/errors';
import type { RoleRepository } from '../../domain/role.repository';
import type { UserRepository } from '../../domain/user.repository';
import type { UserStoreRoleRepository } from '../../domain/user-store-role.repository';
import type { UpdateUserStatusInput } from './update-user-status.dto';

export type UpdateUserStatusError = UserNotFoundError | LastSuperAdminError;

/** Cambia el estado de un usuario (activar/bloquear/deshabilitar), protegiendo al último Super Admin. */
export class UpdateUserStatusUseCase
  implements UseCase<UpdateUserStatusInput, Result<void, UpdateUserStatusError>>
{
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly userStoreRoles: UserStoreRoleRepository,
  ) {}

  async execute(input: UpdateUserStatusInput): Promise<Result<void, UpdateUserStatusError>> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      return err(new UserNotFoundError(input.userId));
    }

    if (input.status !== 'active') {
      const systemRole = await this.roles.findSystemRole();
      if (systemRole) {
        const assignments = await this.userStoreRoles.findByUserId(user.id);
        const isSuperAdmin = assignments.some(
          (a) => a.assignment.storeId === null && a.assignment.roleId === systemRole.id,
        );
        if (isSuperAdmin) {
          const globalCount = await this.userStoreRoles.countGlobalAssignments(systemRole.id);
          if (globalCount <= 1) {
            return err(new LastSuperAdminError());
          }
        }
      }
    }

    user.setStatus(input.status, new Date());

    await this.users.update(user, {
      userId: input.actorUserId,
      storeId: null,
      action: 'user.status_updated',
      entityType: 'user',
      entityId: user.id,
    });

    return ok(undefined);
  }
}
