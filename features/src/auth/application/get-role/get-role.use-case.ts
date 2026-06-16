import { err, ok, Result, UseCase } from '@mitama/core';
import { RoleNotFoundError } from '../../domain/errors';
import type { RoleRepository } from '../../domain/role.repository';
import type { RoleOutput } from '../list-roles/list-roles.dto';

function toRoleOutput(role: NonNullable<Awaited<ReturnType<RoleRepository['findById']>>>): RoleOutput {
  return {
    id: role.id,
    name: role.name,
    isSystem: role.isSystem,
    permissions: role.permissions,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

export class GetRoleUseCase implements UseCase<string, Result<RoleOutput, RoleNotFoundError>> {
  constructor(private readonly roles: RoleRepository) {}

  async execute(roleId: string): Promise<Result<RoleOutput, RoleNotFoundError>> {
    const role = await this.roles.findById(roleId);
    if (!role) {
      return err(new RoleNotFoundError(roleId));
    }
    return ok(toRoleOutput(role));
  }
}
