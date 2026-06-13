import { describe, expect, it, beforeEach } from 'vitest';
import { ValidationError } from '@mitama/core';
import { FakePasswordHasher, InMemoryPasswordCredentialRepository, InMemoryUserRepository } from '../__test-utils__/in-memory-repositories';
import { Email } from '../../domain/email.vo';
import { InvalidCredentialsError, PasswordReuseError, UserNotFoundError } from '../../domain/errors';
import { PasswordCredential } from '../../domain/password-credential.entity';
import { User } from '../../domain/user.entity';
import { ChangePasswordUseCase } from './change-password.use-case';

describe('ChangePasswordUseCase', () => {
  let users: InMemoryUserRepository;
  let passwordCredentials: InMemoryPasswordCredentialRepository;
  let hasher: FakePasswordHasher;
  let useCase: ChangePasswordUseCase;
  let user: User;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    passwordCredentials = new InMemoryPasswordCredentialRepository();
    hasher = new FakePasswordHasher();
    useCase = new ChangePasswordUseCase(users, passwordCredentials, hasher);

    const emailResult = Email.create('maria@ejemplo.mx');
    if (emailResult.isErr()) throw emailResult.error;
    user = User.create({ email: emailResult.value, name: 'María' });
    user.activate(new Date());
    users.users.set(user.id, user);
    passwordCredentials.credentials.push(
      PasswordCredential.create({ userId: user.id, hash: await hasher.hash('actual-1234') }),
    );
  });

  it('cambia la contraseña con la contraseña actual correcta', async () => {
    const result = await useCase.execute({
      userId: user.id,
      currentPassword: 'actual-1234',
      newPassword: 'nueva-contraseña',
    });

    expect(result.isOk()).toBe(true);
    expect(passwordCredentials.credentials).toHaveLength(2);
  });

  it('falla si la contraseña actual es incorrecta', async () => {
    const result = await useCase.execute({
      userId: user.id,
      currentPassword: 'incorrecta',
      newPassword: 'nueva-contraseña',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidCredentialsError);
    }
  });

  it('falla si el usuario no existe', async () => {
    const result = await useCase.execute({
      userId: 'no-existe',
      currentPassword: 'actual-1234',
      newPassword: 'nueva-contraseña',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(UserNotFoundError);
    }
  });

  it('falla si la nueva contraseña es muy corta', async () => {
    const result = await useCase.execute({
      userId: user.id,
      currentPassword: 'actual-1234',
      newPassword: 'corta',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });

  it('falla si la nueva contraseña repite una de las últimas 4', async () => {
    const result = await useCase.execute({
      userId: user.id,
      currentPassword: 'actual-1234',
      newPassword: 'actual-1234',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(PasswordReuseError);
    }
  });
});
