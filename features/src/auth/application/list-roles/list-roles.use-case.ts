import { ok, Result, UseCase } from '@mitama/core';
import type { Role } from '../../domain/role.entity';
import type { RoleRepository } from '../../domain/role.repository';
import type { RoleOutput } from './list-roles.dto';

function toRoleOutput(role: Role): RoleOutput {
  return {
    id: role.id,
    name: role.name,
    isSystem: role.isSystem,
    permissions: role.permissions,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

export class ListRolesUseCase implements UseCase<void, Result<RoleOutput[], never>> {
  constructor(private readonly roles: RoleRepository) {}

  async execute(): Promise<Result<RoleOutput[], never>> {
    const roles = await this.roles.findAll();
    return ok(roles.map(toRoleOutput));
  }
}
