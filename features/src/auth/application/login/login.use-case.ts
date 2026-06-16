import { err, ok, Result, UseCase } from '@mitama/core';
import type { AccessTokenIssuer } from '../../domain/access-token-issuer';
import { AccountDisabledError, AccountLockedError, InvalidCredentialsError } from '../../domain/errors';
import { Email } from '../../domain/email.vo';
import type { PasswordCredentialRepository } from '../../domain/password-credential.repository';
import type { PasswordHasher } from '../../domain/password-hasher';
import { RefreshToken } from '../../domain/refresh-token.entity';
import type { RefreshTokenRepository } from '../../domain/refresh-token.repository';
import type { UserRepository } from '../../domain/user.repository';
import type { UserStoreRoleRepository } from '../../domain/user-store-role.repository';
import { buildAuthContext } from '../shared/auth-context.util';
import { addDays, REFRESH_TOKEN_TTL_DAYS } from '../shared/constants';
import { generateOpaqueToken } from '../shared/token.util';
import type { LoginInput, LoginOutput } from './login.dto';

export type LoginError = InvalidCredentialsError | AccountLockedError | AccountDisabledError;

/**
 * Login email+contraseña. No revela si el email existe (mismo error para
 * email inexistente y contraseña incorrecta). Bloquea la cuenta tras 5
 * intentos fallidos consecutivos durante 15 minutos.
 */
export class LoginUseCase implements UseCase<LoginInput, Result<LoginOutput, LoginError>> {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordCredentials: PasswordCredentialRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly userStoreRoles: UserStoreRoleRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly accessTokenIssuer: AccessTokenIssuer,
  ) {}

  async execute(input: LoginInput): Promise<Result<LoginOutput, LoginError>> {
    const now = new Date();

    const emailResult = Email.create(input.email);
    if (emailResult.isErr()) {
      return err(new InvalidCredentialsError());
    }

    const user = await this.users.findByEmail(emailResult.value);
    if (!user) {
      return err(new InvalidCredentialsError());
    }

    if (user.status === 'disabled') {
      return err(new AccountDisabledError());
    }

    if (user.isLockedAt(now)) {
      return err(new AccountLockedError());
    }

    const [latestCredential] = await this.passwordCredentials.findRecentByUserId(user.id, 1);
    const matches = latestCredential
      ? await this.passwordHasher.compare(input.password, latestCredential.hash)
      : false;

    if (!matches) {
      user.recordFailedLogin(now);
      await this.users.update(user, {
        userId: user.id,
        storeId: null,
        action: 'auth.login_failed',
        entityType: 'user',
        entityId: user.id,
        ip: input.ip ?? null,
      });
      return err(new InvalidCredentialsError());
    }

    user.recordSuccessfulLogin(now);

    const assignments = await this.userStoreRoles.findByUserId(user.id);
    const { isSuperAdmin, storeRoles } = buildAuthContext(assignments);

    const accessToken = this.accessTokenIssuer.sign({
      sub: user.id,
      email: user.email.value,
      isSuperAdmin,
      storeRoles,
    });

    const { plain, hash } = generateOpaqueToken();
    const refreshToken = RefreshToken.create({
      userId: user.id,
      familyId: crypto.randomUUID(),
      tokenHash: hash,
      expiresAt: addDays(now, REFRESH_TOKEN_TTL_DAYS),
    });

    await this.refreshTokens.create(refreshToken, user, {
      userId: user.id,
      storeId: null,
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
      ip: input.ip ?? null,
    });

    return ok({
      accessToken,
      refreshToken: plain,
      user: { id: user.id, email: user.email.value, name: user.name, isSuperAdmin },
    });
  }
}
