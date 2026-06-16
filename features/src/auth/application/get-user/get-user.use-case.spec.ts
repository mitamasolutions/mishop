import { describe, expect, it } from 'vitest';
import {
  InMemoryRoleRepository,
  InMemoryUserRepository,
  InMemoryUserStoreRoleRepository,
} from '../__test-utils__/in-memory-repositories';
import { Email } from '../../domain/email.vo';
import { UserNotFoundError } from '../../domain/errors';
import { User } from '../../domain/user.entity';
import { GetUserUseCase } from './get-user.use-case';

describe('GetUserUseCase', () => {
  it('retorna el usuario por id', async () => {
    const users = new InMemoryUserRepository();
    const roles = new InMemoryRoleRepository();
    const userStoreRoles = new InMemoryUserStoreRoleRepository(roles);
    const useCase = new GetUserUseCase(users, userStoreRoles);

    const emailResult = Email.create('usuario@ejemplo.mx');
    if (emailResult.isErr()) throw emailResult.error;
    const user = User.create({ email: emailResult.value, name: 'Usuario' });
    users.users.set(user.id, user);

    const result = await useCase.execute(user.id);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.email).toBe('usuario@ejemplo.mx');
    }
  });

  it('falla si el usuario no existe', async () => {
    const users = new InMemoryUserRepository();
    const roles = new InMemoryRoleRepository();
    const userStoreRoles = new InMemoryUserStoreRoleRepository(roles);
    const useCase = new GetUserUseCase(users, userStoreRoles);

    const result = await useCase.execute('no-existe');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(UserNotFoundError);
    }
  });
});
