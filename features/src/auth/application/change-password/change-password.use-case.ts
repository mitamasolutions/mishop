import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { InvalidCredentialsError, PasswordReuseError, UserNotFoundError } from '../../domain/errors';
import { PasswordCredential } from '../../domain/password-credential.entity';
import type { PasswordCredentialRepository } from '../../domain/password-credential.repository';
import type { PasswordHasher } from '../../domain/password-hasher';
import { PlainPassword } from '../../domain/plain-password.vo';
import type { UserRepository } from '../../domain/user.repository';
import { PASSWORD_HISTORY_LIMIT } from '../shared/constants';
import type { ChangePasswordInput } from './change-password.dto';

export type ChangePasswordError = UserNotFoundError | InvalidCredentialsError | ValidationError | PasswordReuseError;

/** Cambio de contraseña por el propio usuario; exige la contraseña actual. */
export class ChangePasswordUseCase implements UseCase<ChangePasswordInput, Result<void, ChangePasswordError>> {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordCredentials: PasswordCredentialRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: ChangePasswordInput): Promise<Result<void, ChangePasswordError>> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      return err(new UserNotFoundError(input.userId));
    }

    const [current] = await this.passwordCredentials.findRecentByUserId(user.id, 1);
    if (!current || !(await this.passwordHasher.compare(input.currentPassword, current.hash))) {
      return err(new InvalidCredentialsError());
    }

    const passwordResult = PlainPassword.create(input.newPassword);
    if (passwordResult.isErr()) {
      return err(passwordResult.error);
    }

    const recentCredentials = await this.passwordCredentials.findRecentByUserId(user.id, PASSWORD_HISTORY_LIMIT);
    for (const credential of recentCredentials) {
      if (await this.passwordHasher.compare(input.newPassword, credential.hash)) {
        return err(new PasswordReuseError());
      }
    }

    const newHash = await this.passwordHasher.hash(passwordResult.value.value);
    const credential = PasswordCredential.create({ userId: user.id, hash: newHash });

    await this.passwordCredentials.create(credential, {
      userId: user.id,
      storeId: null,
      action: 'auth.password_changed',
      entityType: 'user',
      entityId: user.id,
    });

    return ok(undefined);
  }
}
