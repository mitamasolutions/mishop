import { ok, Result, UseCase } from '@mitama/core';
import type { UserRepository } from '../../domain/user.repository';
import type { UserStoreRoleRepository } from '../../domain/user-store-role.repository';
import { toUserOutput, type UserOutput } from '../user.dto';

export class ListUsersUseCase implements UseCase<void, Result<UserOutput[], never>> {
  constructor(
    private readonly users: UserRepository,
    private readonly userStoreRoles: UserStoreRoleRepository,
  ) {}

  async execute(): Promise<Result<UserOutput[], never>> {
    const users = await this.users.findAll();
    const outputs: UserOutput[] = [];
    for (const user of users) {
      const assignments = await this.userStoreRoles.findByUserId(user.id);
      outputs.push(toUserOutput(user, assignments));
    }
    return ok(outputs);
  }
}
