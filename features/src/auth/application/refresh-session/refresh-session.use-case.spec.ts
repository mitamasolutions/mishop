import { describe, expect, it, beforeEach } from 'vitest';
import {
  FakeAccessTokenIssuer,
  InMemoryRefreshTokenRepository,
  InMemoryRoleRepository,
  InMemoryUserRepository,
  InMemoryUserStoreRoleRepository,
} from '../__test-utils__/in-memory-repositories';
import { Email } from '../../domain/email.vo';
import { InvalidOrExpiredTokenError } from '../../domain/errors';
import { RefreshToken } from '../../domain/refresh-token.entity';
import { User } from '../../domain/user.entity';
import { generateOpaqueToken } from '../shared/token.util';
import { addDays } from '../shared/constants';
import { RefreshSessionUseCase } from './refresh-session.use-case';

describe('RefreshSessionUseCase', () => {
  let users: InMemoryUserRepository;
  let refreshTokens: InMemoryRefreshTokenRepository;
  let userStoreRoles: InMemoryUserStoreRoleRepository;
  let useCase: RefreshSessionUseCase;

  function createUser(): User {
    const emailResult = Email.create('maria@ejemplo.mx');
    if (emailResult.isErr()) {
      throw emailResult.error;
    }
    const user = User.create({ email: emailResult.value, name: 'María' });
    user.activate(new Date());
    users.users.set(user.id, user);
    return user;
  }

  function issueToken(userId: string, familyId: string, options: { expiresAt?: Date; revoked?: boolean } = {}) {
    const { plain, hash } = generateOpaqueToken();
    const token = RefreshToken.create({
      userId,
      familyId,
      tokenHash: hash,
      expiresAt: options.expiresAt ?? addDays(new Date(), 7),
    });
    if (options.revoked) {
      token.revoke(new Date());
    }
    refreshTokens.tokens.set(token.id, token);
    return { plain, token };
  }

  beforeEach(() => {
    users = new InMemoryUserRepository();
    refreshTokens = new InMemoryRefreshTokenRepository();
    const roles = new InMemoryRoleRepository();
    userStoreRoles = new InMemoryUserStoreRoleRepository(roles);
    useCase = new RefreshSessionUseCase(users, refreshTokens, userStoreRoles, new FakeAccessTokenIssuer());
  });

  it('rota el refresh token y emite un access token nuevo', async () => {
    const user = createUser();
    const { plain } = issueToken(user.id, 'family-1');

    const result = await useCase.execute({ refreshToken: plain });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.refreshToken).not.toBe(plain);
      expect(result.value.accessToken).toBeTruthy();
    }
    expect([...refreshTokens.tokens.values()].filter((t) => !t.isRevoked())).toHaveLength(1);
  });

  it('falla si el token no existe', async () => {
    const result = await useCase.execute({ refreshToken: 'no-existe' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidOrExpiredTokenError);
    }
  });

  it('falla si el token está expirado', async () => {
    const user = createUser();
    const { plain } = issueToken(user.id, 'family-1', { expiresAt: addDays(new Date(), -1) });

    const result = await useCase.execute({ refreshToken: plain });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidOrExpiredTokenError);
    }
  });

  it('revoca toda la familia si el token ya estaba rotado (reuso)', async () => {
    const user = createUser();
    const { plain } = issueToken(user.id, 'family-1', { revoked: true });
    issueToken(user.id, 'family-1');

    const result = await useCase.execute({ refreshToken: plain });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidOrExpiredTokenError);
    }
    expect([...refreshTokens.tokens.values()].every((t) => t.isRevoked())).toBe(true);
  });

  it('falla si el usuario está deshabilitado', async () => {
    const user = createUser();
    user.setStatus('disabled', new Date());
    const { plain } = issueToken(user.id, 'family-1');

    const result = await useCase.execute({ refreshToken: plain });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidOrExpiredTokenError);
    }
  });
});
