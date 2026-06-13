import { err, ok, Result, UseCase } from '@mitama/core';
import type { AccessTokenIssuer } from '../../domain/access-token-issuer';
import { InvalidOrExpiredTokenError } from '../../domain/errors';
import { RefreshToken } from '../../domain/refresh-token.entity';
import type { RefreshTokenRepository } from '../../domain/refresh-token.repository';
import type { UserRepository } from '../../domain/user.repository';
import type { UserStoreRoleRepository } from '../../domain/user-store-role.repository';
import { buildAuthContext } from '../shared/auth-context.util';
import { addDays, REFRESH_TOKEN_TTL_DAYS } from '../shared/constants';
import { generateOpaqueToken, hashToken } from '../shared/token.util';
import type { RefreshSessionInput, RefreshSessionOutput } from './refresh-session.dto';

export type RefreshSessionError = InvalidOrExpiredTokenError;

/**
 * Rota el refresh token: invalida el anterior y emite un par nuevo de la
 * misma familia. Si el token presentado ya estaba revocado (reuso), revoca
 * toda la familia y obliga a re-login.
 */
export class RefreshSessionUseCase
  implements UseCase<RefreshSessionInput, Result<RefreshSessionOutput, RefreshSessionError>>
{
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly userStoreRoles: UserStoreRoleRepository,
    private readonly accessTokenIssuer: AccessTokenIssuer,
  ) {}

  async execute(input: RefreshSessionInput): Promise<Result<RefreshSessionOutput, RefreshSessionError>> {
    const now = new Date();
    const tokenHash = hashToken(input.refreshToken);
    const token = await this.refreshTokens.findByTokenHash(tokenHash);

    if (!token) {
      return err(new InvalidOrExpiredTokenError());
    }

    if (token.isRevoked()) {
      await this.refreshTokens.revokeFamily(token.familyId, {
        userId: token.userId,
        storeId: null,
        action: 'auth.refresh_token_reuse_detected',
        entityType: 'user',
        entityId: token.userId,
        ip: input.ip ?? null,
      });
      return err(new InvalidOrExpiredTokenError('La sesión fue revocada por reuso de un token. Inicia sesión de nuevo'));
    }

    if (token.isExpiredAt(now)) {
      return err(new InvalidOrExpiredTokenError());
    }

    const user = await this.users.findById(token.userId);
    if (!user || user.status === 'disabled') {
      await this.refreshTokens.revokeFamily(token.familyId, {
        userId: token.userId,
        storeId: null,
        action: 'auth.refresh_token_reuse_detected',
        entityType: 'user',
        entityId: token.userId,
        ip: input.ip ?? null,
      });
      return err(new InvalidOrExpiredTokenError());
    }

    token.revoke(now);
    const { plain, hash } = generateOpaqueToken();
    const next = RefreshToken.create({
      userId: token.userId,
      familyId: token.familyId,
      tokenHash: hash,
      expiresAt: addDays(now, REFRESH_TOKEN_TTL_DAYS),
    });

    await this.refreshTokens.rotate(token, next, {
      userId: user.id,
      storeId: null,
      action: 'auth.token_refreshed',
      entityType: 'user',
      entityId: user.id,
      ip: input.ip ?? null,
    });

    const assignments = await this.userStoreRoles.findByUserId(user.id);
    const { isSuperAdmin, storeRoles } = buildAuthContext(assignments);

    const accessToken = this.accessTokenIssuer.sign({
      sub: user.id,
      email: user.email.value,
      isSuperAdmin,
      storeRoles,
    });

    return ok({ accessToken, refreshToken: plain });
  }
}
