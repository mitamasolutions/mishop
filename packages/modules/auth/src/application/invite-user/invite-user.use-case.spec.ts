import { describe, expect, it, beforeEach } from 'vitest';
import { ValidationError } from '@mitama/core';
import {
  InMemoryInvitationTokenRepository,
  InMemoryPasswordCredentialRepository,
  InMemoryRoleRepository,
  InMemoryUserRepository,
  InMemoryUserStoreRoleRepository,
} from '../__test-utils__/in-memory-repositories';
import { Email } from '../../domain/email.vo';
import { EmailAlreadyInUseError, RoleNotFoundError } from '../../domain/errors';
import { Role, SUPER_ADMIN_ROLE_NAME } from '../../domain/role.entity';
import { User } from '../../domain/user.entity';
import { InviteUserUseCase } from './invite-user.use-case';

describe('InviteUserUseCase', () => {
  let users: InMemoryUserRepository;
  let roles: InMemoryRoleRepository;
  let userStoreRoles: InMemoryUserStoreRoleRepository;
  let invitationTokens: InMemoryInvitationTokenRepository;
  let useCase: InviteUserUseCase;
  let storeRole: Role;
  let superAdminRole: Role;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    roles = new InMemoryRoleRepository();
    userStoreRoles = new InMemoryUserStoreRoleRepository(roles);
    invitationTokens = new InMemoryInvitationTokenRepository(users, userStoreRoles, new InMemoryPasswordCredentialRepository());
    useCase = new InviteUserUseCase(users, roles, invitationTokens);

    storeRole = Role.create({ name: 'Operador', permissions: [] });
    roles.roles.set(storeRole.id, storeRole);

    superAdminRole = Role.create({ name: SUPER_ADMIN_ROLE_NAME, isSystem: true, permissions: [] });
    roles.roles.set(superAdminRole.id, superAdminRole);
  });

  it('invita a un usuario nuevo con rol de tienda', async () => {
    const result = await useCase.execute({
      actorUserId: 'actor-1',
      email: 'nuevo@ejemplo.mx',
      name: 'Nuevo Usuario',
      roleId: storeRole.id,
      storeId: 'store-1',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.invitationToken).toHaveLength(64);
      const created = await users.findById(result.value.userId);
      expect(created?.status).toBe('invited');
    }
    expect(invitationTokens.tokens.size).toBe(1);
    expect(userStoreRoles.assignments.size).toBe(1);
  });

  it('falla si el email ya está en uso', async () => {
    const emailResult = Email.create('existente@ejemplo.mx');
    if (emailResult.isErr()) throw emailResult.error;
    const existing = User.create({ email: emailResult.value, name: 'Existente' });
    users.users.set(existing.id, existing);

    const result = await useCase.execute({
      actorUserId: 'actor-1',
      email: 'existente@ejemplo.mx',
      name: 'Nuevo Usuario',
      roleId: storeRole.id,
      storeId: 'store-1',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(EmailAlreadyInUseError);
    }
  });

  it('falla si el rol no existe', async () => {
    const result = await useCase.execute({
      actorUserId: 'actor-1',
      email: 'nuevo@ejemplo.mx',
      name: 'Nuevo Usuario',
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
      email: 'nuevo@ejemplo.mx',
      name: 'Nuevo Usuario',
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
      email: 'admin@ejemplo.mx',
      name: 'Nuevo Admin',
      roleId: superAdminRole.id,
      storeId: null,
    });

    expect(result.isOk()).toBe(true);
  });
});
