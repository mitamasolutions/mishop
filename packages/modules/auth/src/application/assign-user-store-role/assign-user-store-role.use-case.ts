import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { RoleNotFoundError, UserNotFoundError, UserStoreRoleAlreadyExistsError } from '../../domain/errors';
import type { RoleRepository } from '../../domain/role.repository';
import type { UserRepository } from '../../domain/user.repository';
import { UserStoreRole } from '../../domain/user-store-role.entity';
import type { UserStoreRoleRepository } from '../../domain/user-store-role.repository';
import type { AssignUserStoreRoleInput, AssignUserStoreRoleOutput } from './assign-user-store-role.dto';

export type AssignUserStoreRoleError =
  | ValidationError
  | UserNotFoundError
  | RoleNotFoundError
  | UserStoreRoleAlreadyExistsError;

/** Asigna un rol a un usuario en una tienda (o globalmente, solo para el rol Super Admin). */
export class AssignUserStoreRoleUseCase
  implements UseCase<AssignUserStoreRoleInput, Result<AssignUserStoreRoleOutput, AssignUserStoreRoleError>>
{
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly userStoreRoles: UserStoreRoleRepository,
  ) {}

  async execute(
    input: AssignUserStoreRoleInput,
  ): Promise<Result<AssignUserStoreRoleOutput, AssignUserStoreRoleError>> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      return err(new UserNotFoundError(input.userId));
    }

    const role = await this.roles.findById(input.roleId);
    if (!role) {
      return err(new RoleNotFoundError(input.roleId));
    }

    if (input.storeId === null && !role.isSystem) {
      return err(new ValidationError('Solo el rol Super Admin puede asignarse de forma global, sin tienda'));
    }

    const existingAssignments = await this.userStoreRoles.findByUserId(user.id);
    const alreadyAssigned = existingAssignments.some(
      (a) => a.assignment.roleId === input.roleId && a.assignment.storeId === input.storeId,
    );
    if (alreadyAssigned) {
      return err(new UserStoreRoleAlreadyExistsError());
    }

    const assignment = UserStoreRole.create({
      userId: user.id,
      storeId: input.storeId,
      roleId: role.id,
    });

    await this.userStoreRoles.create(assignment, {
      userId: input.actorUserId,
      storeId: input.storeId,
      action: 'user.role_assigned',
      entityType: 'user',
      entityId: user.id,
    });

    return ok({ assignmentId: assignment.id });
  }
}
