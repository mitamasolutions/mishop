import { describe, expect, it, beforeEach } from 'vitest';
import { InMemoryRefreshTokenRepository } from '../__test-utils__/in-memory-repositories';
import { RefreshToken } from '../../domain/refresh-token.entity';
import { addDays } from '../shared/constants';
import { generateOpaqueToken } from '../shared/token.util';
import { LogoutUseCase } from './logout.use-case';

describe('LogoutUseCase', () => {
  let refreshTokens: InMemoryRefreshTokenRepository;
  let useCase: LogoutUseCase;

  beforeEach(() => {
    refreshTokens = new InMemoryRefreshTokenRepository();
    useCase = new LogoutUseCase(refreshTokens);
  });

  it('revoca toda la familia del refresh token', async () => {
    const { plain, hash } = generateOpaqueToken();
    const token = RefreshToken.create({
      userId: 'user-1',
      familyId: 'family-1',
      tokenHash: hash,
      expiresAt: addDays(new Date(), 7),
    });
    refreshTokens.tokens.set(token.id, token);

    const result = await useCase.execute({ refreshToken: plain });

    expect(result.isOk()).toBe(true);
    expect(token.isRevoked()).toBe(true);
  });

  it('no falla si el token ya no existe', async () => {
    const result = await useCase.execute({ refreshToken: 'no-existe' });

    expect(result.isOk()).toBe(true);
  });
});
