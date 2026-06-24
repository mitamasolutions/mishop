import { describe, expect, it, beforeEach } from 'vitest';
import {
  FakeAccessTokenIssuer,
  FakePasswordHasher,
  InMemoryPasswordCredentialRepository,
  InMemoryRefreshTokenRepository,
  InMemoryRoleRepository,
  InMemoryUserRepository,
  InMemoryUserStoreRoleRepository,
} from '../__test-utils__/in-memory-repositories';
import { Email } from '../../domain/email.vo';
import { AccountDisabledError, AccountLockedError, InvalidCredentialsError } from '../../domain/errors';
import { PasswordCredential } from '../../domain/password-credential.entity';
import { User } from '../../domain/user.entity';
import { LoginUseCase } from './login.use-case';

describe('LoginUseCase', () => {
  let users: InMemoryUserRepository;
  let passwordCredentials: InMemoryPasswordCredentialRepository;
  let refreshTokens: InMemoryRefreshTokenRepository;
  let userStoreRoles: InMemoryUserStoreRoleRepository;
  let roles: InMemoryRoleRepository;
  let useCase: LoginUseCase;

  async function createActiveUser(email: string, password: string): Promise<User> {
    const emailResult = Email.create(email);
    if (emailResult.isErr()) {
      throw emailResult.error;
    }
    const user = User.create({ email: emailResult.value, name: 'María' });
    user.activate(new Date());
    users.users.set(user.id, user);
    const hash = await new FakePasswordHasher().hash(password);
    passwordCredentials.credentials.push(PasswordCredential.create({ userId: user.id, hash }));
    return user;
  }

  beforeEach(() => {
    users = new InMemoryUserRepository();
    passwordCredentials = new InMemoryPasswordCredentialRepository();
    refreshTokens = new InMemoryRefreshTokenRepository();
    roles = new InMemoryRoleRepository();
    userStoreRoles = new InMemoryUserStoreRoleRepository(roles);
    useCase = new LoginUseCase(
      users,
      passwordCredentials,
      refreshTokens,
      userStoreRoles,
      new FakePasswordHasher(),
      new FakeAccessTokenIssuer(),
    );
  });

  it('devuelve access y refresh token con credenciales válidas', async () => {
    await createActiveUser('maria@ejemplo.mx', 'super-secreta');

    const result = await useCase.execute({ email: 'maria@ejemplo.mx', password: 'super-secreta' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.accessToken).toBeTruthy();
      expect(result.value.refreshToken).toBeTruthy();
      expect(result.value.user.email).toBe('maria@ejemplo.mx');
    }
    expect(refreshTokens.tokens.size).toBe(1);
  });

  it('falla con error genérico si el email no existe', async () => {
    const result = await useCase.execute({ email: 'nadie@ejemplo.mx', password: 'lo-que-sea' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidCredentialsError);
    }
  });

  it('falla con el mismo error genérico si la contraseña es incorrecta', async () => {
    await createActiveUser('maria@ejemplo.mx', 'super-secreta');

    const result = await useCase.execute({ email: 'maria@ejemplo.mx', password: 'incorrecta' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidCredentialsError);
    }
  });

  it('bloquea la cuenta tras 5 intentos fallidos consecutivos', async () => {
    await createActiveUser('maria@ejemplo.mx', 'super-secreta');

    for (let i = 0; i < 5; i++) {
      await useCase.execute({ email: 'maria@ejemplo.mx', password: 'incorrecta' });
    }

    const result = await useCase.execute({ email: 'maria@ejemplo.mx', password: 'super-secreta' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(AccountLockedError);
    }
  });

  it('falla con AccountDisabledError si el usuario está deshabilitado', async () => {
    const user = await createActiveUser('maria@ejemplo.mx', 'super-secreta');
    user.setStatus('disabled', new Date());

    const result = await useCase.execute({ email: 'maria@ejemplo.mx', password: 'super-secreta' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(AccountDisabledError);
    }
  });

  it('falla con error genérico si el usuario está invitado (sin credencial)', async () => {
    const emailResult = Email.create('nuevo@ejemplo.mx');
    if (emailResult.isErr()) {
      throw emailResult.error;
    }
    const user = User.create({ email: emailResult.value, name: 'Nuevo' });
    users.users.set(user.id, user);

    const result = await useCase.execute({ email: 'nuevo@ejemplo.mx', password: 'cualquiera' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidCredentialsError);
    }
  });
});
