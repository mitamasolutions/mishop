import { describe, expect, it, beforeEach } from 'vitest';
import { ValidationError } from '@mitama/core';
import {
  InMemoryRoleRepository,
  InMemoryUserRepository,
  InMemoryUserStoreRoleRepository,
} from '../__test-utils__/in-memory-repositories';
import { Email } from '../../domain/email.vo';
import { RoleNotFoundError, UserNotFoundError, UserStoreRoleAlreadyExistsError } from '../../domain/errors';
import { Role, SUPER_ADMIN_ROLE_NAME } from '../../domain/role.entity';
import { User } from '../../domain/user.entity';
import { UserStoreRole } from '../../domain/user-store-role.entity';
import { AssignUserStoreRoleUseCase } from './assign-user-store-role.use-case';

describe('AssignUserStoreRoleUseCase', () => {
  let users: InMemoryUserRepository;
  let roles: InMemoryRoleRepository;
  let userStoreRoles: InMemoryUserStoreRoleRepository;
  let useCase: AssignUserStoreRoleUseCase;
  let user: User;
  let storeRole: Role;
  let superAdminRole: Role;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    roles = new InMemoryRoleRepository();
    userStoreRoles = new InMemoryUserStoreRoleRepository(roles);
    useCase = new AssignUserStoreRoleUseCase(users, roles, userStoreRoles);

    const emailResult = Email.create('usuario@ejemplo.mx');
    if (emailResult.isErr()) throw emailResult.error;
    user = User.create({ email: emailResult.value, name: 'Usuario' });
    users.users.set(user.id, user);

    storeRole = Role.create({ name: 'Operador', permissions: [] });
    roles.roles.set(storeRole.id, storeRole);

    superAdminRole = Role.create({ name: SUPER_ADMIN_ROLE_NAME, isSystem: true, permissions: [] });
    roles.roles.set(superAdminRole.id, superAdminRole);
  });

  it('asigna un rol en una tienda', async () => {
    const result = await useCase.execute({
      actorUserId: 'actor-1',
      userId: user.id,
      roleId: storeRole.id,
      storeId: 'store-1',
    });

    expect(result.isOk()).toBe(true);
    expect(userStoreRoles.assignments.size).toBe(1);
  });

  it('falla si el usuario no existe', async () => {
    const result = await useCase.execute({
      actorUserId: 'actor-1',
      userId: 'no-existe',
      roleId: storeRole.id,
      storeId: 'store-1',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(UserNotFoundError);
    }
  });

  it('falla si el rol no existe', async () => {
    const result = await useCase.execute({
      actorUserId: 'actor-1',
      userId: user.id,
      roleId: 'no-existe',
      storeId: 'store-1',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(RoleNotFoundError);
    }
  });

  it('falla si storeId es null y el rol no es de sistema', async () => {
    const result = await useCase.execute({
      actorUserId: 'actor-1',
      userId: user.id,
      roleId: storeRole.id,
      storeId: null,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });

  it('permite storeId null para el rol Super Admin', async () => {
    const result = await useCase.execute({
      actorUserId: 'actor-1',
      userId: user.id,
      roleId: superAdminRole.id,
      storeId: null,
    });

    expect(result.isOk()).toBe(true);
  });

  it('falla si la asignación ya existe', async () => {
    const existing = UserStoreRole.create({ userId: user.id, storeId: 'store-1', roleId: storeRole.id });
    userStoreRoles.assignments.set(existing.id, existing);

    const result = await useCase.execute({
      actorUserId: 'actor-1',
      userId: user.id,
      roleId: storeRole.id,
      storeId: 'store-1',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(UserStoreRoleAlreadyExistsError);
    }
  });
});
