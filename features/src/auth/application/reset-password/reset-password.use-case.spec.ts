import { describe, expect, it, beforeEach } from 'vitest';
import { ValidationError } from '@mitama/core';
import {
  FakePasswordHasher,
  InMemoryPasswordCredentialRepository,
  InMemoryPasswordResetTokenRepository,
  InMemoryUserRepository,
} from '../__test-utils__/in-memory-repositories';
import { Email } from '../../domain/email.vo';
import { InvalidOrExpiredTokenError, PasswordReuseError } from '../../domain/errors';
import { PasswordCredential } from '../../domain/password-credential.entity';
import { PasswordResetToken } from '../../domain/password-reset-token.entity';
import { User } from '../../domain/user.entity';
import { addHours } from '../shared/constants';
import { generateOpaqueToken } from '../shared/token.util';
import { ResetPasswordUseCase } from './reset-password.use-case';

describe('ResetPasswordUseCase', () => {
  let users: InMemoryUserRepository;
  let passwordCredentials: InMemoryPasswordCredentialRepository;
  let passwordResetTokens: InMemoryPasswordResetTokenRepository;
  let hasher: FakePasswordHasher;
  let useCase: ResetPasswordUseCase;
  let user: User;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    passwordCredentials = new InMemoryPasswordCredentialRepository();
    passwordResetTokens = new InMemoryPasswordResetTokenRepository(users, passwordCredentials);
    hasher = new FakePasswordHasher();
    useCase = new ResetPasswordUseCase(users, passwordCredentials, passwordResetTokens, hasher);

    const emailResult = Email.create('maria@ejemplo.mx');
    if (emailResult.isErr()) throw emailResult.error;
    user = User.create({ email: emailResult.value, name: 'María' });
    user.activate(new Date());
    users.users.set(user.id, user);
    passwordCredentials.credentials.push(
      PasswordCredential.create({ userId: user.id, hash: await hasher.hash('actual-1234') }),
    );
  });

  function issueResetToken(expiresAt = addHours(new Date(), 1)): string {
    const { plain, hash } = generateOpaqueToken();
    const token = PasswordResetToken.create({ userId: user.id, tokenHash: hash, expiresAt });
    passwordResetTokens.tokens.set(token.id, token);
    return plain;
  }

  it('cambia la contraseña con un token válido', async () => {
    const plain = issueResetToken();

    const result = await useCase.execute({ token: plain, newPassword: 'nueva-contraseña' });

    expect(result.isOk()).toBe(true);
    expect(passwordCredentials.credentials).toHaveLength(2);
  });

  it('falla con un token expirado', async () => {
    const plain = issueResetToken(addHours(new Date(), -1));

    const result = await useCase.execute({ token: plain, newPassword: 'nueva-contraseña' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidOrExpiredTokenError);
    }
  });

  it('falla con un token ya usado', async () => {
    const plain = issueResetToken();
    await useCase.execute({ token: plain, newPassword: 'nueva-contraseña' });

    const result = await useCase.execute({ token: plain, newPassword: 'otra-contraseña' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidOrExpiredTokenError);
    }
  });

  it('falla si la nueva contraseña es muy corta', async () => {
    const plain = issueResetToken();

    const result = await useCase.execute({ token: plain, newPassword: 'corta' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });

  it('falla si la nueva contraseña es igual a una de las últimas 4', async () => {
    const plain = issueResetToken();

    const result = await useCase.execute({ token: plain, newPassword: 'actual-1234' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(PasswordReuseError);
    }
  });
});
