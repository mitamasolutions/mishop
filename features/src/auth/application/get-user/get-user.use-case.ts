import { err, ok, Result, UseCase } from '@mitama/core';
import { UserNotFoundError } from '../../domain/errors';
import type { UserRepository } from '../../domain/user.repository';
import type { UserStoreRoleRepository } from '../../domain/user-store-role.repository';
import { toUserOutput, type UserOutput } from '../user.dto';

export class GetUserUseCase implements UseCase<string, Result<UserOutput, UserNotFoundError>> {
  constructor(
    private readonly users: UserRepository,
    private readonly userStoreRoles: UserStoreRoleRepository,
  ) {}

  async execute(userId: string): Promise<Result<UserOutput, UserNotFoundError>> {
    const user = await this.users.findById(userId);
    if (!user) {
      return err(new UserNotFoundError(userId));
    }
    const assignments = await this.userStoreRoles.findByUserId(user.id);
    return ok(toUserOutput(user, assignments));
  }
}
