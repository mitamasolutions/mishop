import { describe, expect, it, beforeEach } from 'vitest';
import { ValidationError } from '@mitama/core';
import {
  FakePasswordHasher,
  InMemoryInvitationTokenRepository,
  InMemoryPasswordCredentialRepository,
  InMemoryRoleRepository,
  InMemoryUserRepository,
  InMemoryUserStoreRoleRepository,
} from '../__test-utils__/in-memory-repositories';
import { Email } from '../../domain/email.vo';
import { InvalidOrExpiredTokenError } from '../../domain/errors';
import { InvitationToken } from '../../domain/invitation-token.entity';
import { User } from '../../domain/user.entity';
import { generateOpaqueToken } from '../shared/token.util';
import { AcceptInvitationUseCase } from './accept-invitation.use-case';

describe('AcceptInvitationUseCase', () => {
  let users: InMemoryUserRepository;
  let invitationTokens: InMemoryInvitationTokenRepository;
  let passwordCredentials: InMemoryPasswordCredentialRepository;
  let hasher: FakePasswordHasher;
  let useCase: AcceptInvitationUseCase;
  let user: User;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    const roles = new InMemoryRoleRepository();
    const userStoreRoles = new InMemoryUserStoreRoleRepository(roles);
    passwordCredentials = new InMemoryPasswordCredentialRepository();
    invitationTokens = new InMemoryInvitationTokenRepository(users, userStoreRoles, passwordCredentials);
    hasher = new FakePasswordHasher();
    useCase = new AcceptInvitationUseCase(users, invitationTokens, hasher);

    const emailResult = Email.create('invitado@ejemplo.mx');
    if (emailResult.isErr()) throw emailResult.error;
    user = User.create({ email: emailResult.value, name: 'Invitado' });
    users.users.set(user.id, user);
  });

  function createToken(overrides: Partial<{ expiresAt: Date; acceptedAt: Date | null }> = {}) {
    const { plain, hash } = generateOpaqueToken();
    const token = InvitationToken.create({
      userId: user.id,
      tokenHash: hash,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60 * 60_000),
    });
    if (overrides.acceptedAt) {
      token.accept(overrides.acceptedAt);
    }
    invitationTokens.tokens.set(token.id, token);
    return plain;
  }

  it('acepta la invitación y activa al usuario', async () => {
    const plain = createToken();

    const result = await useCase.execute({ token: plain, password: 'contraseña-segura' });

    expect(result.isOk()).toBe(true);
    expect(user.status).toBe('active');
    expect(passwordCredentials.credentials).toHaveLength(1);
  });

  it('falla si el token no existe', async () => {
    const result = await useCase.execute({ token: 'token-invalido', password: 'contraseña-segura' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidOrExpiredTokenError);
    }
  });

  it('falla si el token expiró', async () => {
    const plain = createToken({ expiresAt: new Date(Date.now() - 1000) });

    const result = await useCase.execute({ token: plain, password: 'contraseña-segura' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidOrExpiredTokenError);
    }
  });

  it('falla si el token ya fue aceptado', async () => {
    const plain = createToken({ acceptedAt: new Date() });

    const result = await useCase.execute({ token: plain, password: 'contraseña-segura' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidOrExpiredTokenError);
    }
  });

  it('falla si la contraseña es muy corta', async () => {
    const plain = createToken();

    const result = await useCase.execute({ token: plain, password: 'corta' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });
});
