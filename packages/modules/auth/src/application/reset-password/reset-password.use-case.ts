import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { InvalidOrExpiredTokenError, PasswordReuseError } from '../../domain/errors';
import { PasswordCredential } from '../../domain/password-credential.entity';
import type { PasswordCredentialRepository } from '../../domain/password-credential.repository';
import type { PasswordHasher } from '../../domain/password-hasher';
import type { PasswordResetTokenRepository } from '../../domain/password-reset-token.repository';
import { PlainPassword } from '../../domain/plain-password.vo';
import type { UserRepository } from '../../domain/user.repository';
import { PASSWORD_HISTORY_LIMIT } from '../shared/constants';
import { hashToken } from '../shared/token.util';
import type { ResetPasswordInput } from './reset-password.dto';

export type ResetPasswordError = InvalidOrExpiredTokenError | ValidationError | PasswordReuseError;

/**
 * Consume un token de recuperación (1h, un solo uso) y registra una
 * contraseña nueva, rechazando cualquiera de las últimas 4.
 */
export class ResetPasswordUseCase implements UseCase<ResetPasswordInput, Result<void, ResetPasswordError>> {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordCredentials: PasswordCredentialRepository,
    private readonly passwordResetTokens: PasswordResetTokenRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: ResetPasswordInput): Promise<Result<void, ResetPasswordError>> {
    const now = new Date();
    const tokenHash = hashToken(input.token);
    const resetToken = await this.passwordResetTokens.findByTokenHash(tokenHash);

    if (!resetToken || resetToken.isUsed() || resetToken.isExpiredAt(now)) {
      return err(new InvalidOrExpiredTokenError());
    }

    const passwordResult = PlainPassword.create(input.newPassword);
    if (passwordResult.isErr()) {
      return err(passwordResult.error);
    }

    const user = await this.users.findById(resetToken.userId);
    if (!user) {
      return err(new InvalidOrExpiredTokenError());
    }

    const recentCredentials = await this.passwordCredentials.findRecentByUserId(user.id, PASSWORD_HISTORY_LIMIT);
    for (const credential of recentCredentials) {
      if (await this.passwordHasher.compare(input.newPassword, credential.hash)) {
        return err(new PasswordReuseError());
      }
    }

    const newHash = await this.passwordHasher.hash(passwordResult.value.value);
    const credential = PasswordCredential.create({ userId: user.id, hash: newHash });

    resetToken.markUsed(now);
    user.recordSuccessfulLogin(now);

    await this.passwordResetTokens.consume(resetToken, { user, credential }, {
      userId: user.id,
      storeId: null,
      action: 'auth.password_reset',
      entityType: 'user',
      entityId: user.id,
    });

    return ok(undefined);
  }
}
