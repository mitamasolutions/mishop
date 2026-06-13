import { ok, Result, UseCase } from '@mitama/core';
import type { RefreshTokenRepository } from '../../domain/refresh-token.repository';
import { hashToken } from '../shared/token.util';
import type { LogoutInput } from './logout.dto';

/** Revoca toda la familia del refresh token presentado, terminando la sesión. */
export class LogoutUseCase implements UseCase<LogoutInput, Result<void, never>> {
  constructor(private readonly refreshTokens: RefreshTokenRepository) {}

  async execute(input: LogoutInput): Promise<Result<void, never>> {
    const tokenHash = hashToken(input.refreshToken);
    const token = await this.refreshTokens.findByTokenHash(tokenHash);

    if (token && !token.isRevoked()) {
      await this.refreshTokens.revokeFamily(token.familyId, {
        userId: token.userId,
        storeId: null,
        action: 'auth.logout',
        entityType: 'user',
        entityId: token.userId,
        ip: input.ip ?? null,
      });
    }

    return ok(undefined);
  }
}
