import { describe, expect, it, beforeEach } from 'vitest';
import {
  InMemoryPasswordCredentialRepository,
  InMemoryPasswordResetTokenRepository,
  InMemoryUserRepository,
} from '../__test-utils__/in-memory-repositories';
import { Email } from '../../domain/email.vo';
import { User } from '../../domain/user.entity';
import { RequestPasswordResetUseCase } from './request-password-reset.use-case';

describe('RequestPasswordResetUseCase', () => {
  let users: InMemoryUserRepository;
  let passwordResetTokens: InMemoryPasswordResetTokenRepository;
  let useCase: RequestPasswordResetUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    const passwordCredentials = new InMemoryPasswordCredentialRepository();
    passwordResetTokens = new InMemoryPasswordResetTokenRepository(users, passwordCredentials);
    useCase = new RequestPasswordResetUseCase(users, passwordResetTokens);
  });

  it('genera un token cuando el email corresponde a una cuenta activa', async () => {
    const emailResult = Email.create('maria@ejemplo.mx');
    if (emailResult.isErr()) throw emailResult.error;
    const user = User.create({ email: emailResult.value, name: 'María' });
    user.activate(new Date());
    users.users.set(user.id, user);

    const result = await useCase.execute({ email: 'maria@ejemplo.mx' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.token).toBeTruthy();
    }
    expect(passwordResetTokens.tokens.size).toBe(1);
  });

  it('responde ok sin generar token si el email no existe (no revela cuentas)', async () => {
    const result = await useCase.execute({ email: 'nadie@ejemplo.mx' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.token).toBeUndefined();
    }
    expect(passwordResetTokens.tokens.size).toBe(0);
  });
});
