import { describe, expect, it, beforeEach } from 'vitest';
import {
  InMemoryRoleRepository,
  InMemoryUserRepository,
  InMemoryUserStoreRoleRepository,
} from '../__test-utils__/in-memory-repositories';
import { Email } from '../../domain/email.vo';
import { LastSuperAdminError, UserNotFoundError } from '../../domain/errors';
import { Role, SUPER_ADMIN_ROLE_NAME } from '../../domain/role.entity';
import { User } from '../../domain/user.entity';
import { UserStoreRole } from '../../domain/user-store-role.entity';
import { UpdateUserStatusUseCase } from './update-user-status.use-case';

describe('UpdateUserStatusUseCase', () => {
  let users: InMemoryUserRepository;
  let roles: InMemoryRoleRepository;
  let userStoreRoles: InMemoryUserStoreRoleRepository;
  let useCase: UpdateUserStatusUseCase;
  let superAdminRole: Role;
  let user: User;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    roles = new InMemoryRoleRepository();
    userStoreRoles = new InMemoryUserStoreRoleRepository(roles);
    useCase = new UpdateUserStatusUseCase(users, roles, userStoreRoles);

    superAdminRole = Role.create({ name: SUPER_ADMIN_ROLE_NAME, isSystem: true, permissions: [] });
    roles.roles.set(superAdminRole.id, superAdminRole);

    const emailResult = Email.create('usuario@ejemplo.mx');
    if (emailResult.isErr()) throw emailResult.error;
    user = User.create({ email: emailResult.value, name: 'Usuario' });
    user.activate(new Date());
    users.users.set(user.id, user);
  });

  it('actualiza el estado de un usuario normal', async () => {
    const result = await useCase.execute({ actorUserId: 'actor-1', userId: user.id, status: 'disabled' });

    expect(result.isOk()).toBe(true);
    expect(user.status).toBe('disabled');
  });

  it('falla si el usuario no existe', async () => {
    const result = await useCase.execute({ actorUserId: 'actor-1', userId: 'no-existe', status: 'disabled' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(UserNotFoundError);
    }
  });

  it('falla si es el último Super Admin global', async () => {
    const assignment = UserStoreRole.create({ userId: user.id, storeId: null, roleId: superAdminRole.id });
    userStoreRoles.assignments.set(assignment.id, assignment);

    const result = await useCase.execute({ actorUserId: 'actor-1', userId: user.id, status: 'disabled' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(LastSuperAdminError);
    }
  });

  it('permite deshabilitar a un Super Admin si hay otro', async () => {
    const assignment1 = UserStoreRole.create({ userId: user.id, storeId: null, roleId: superAdminRole.id });
    const assignment2 = UserStoreRole.create({ userId: 'otro-usuario', storeId: null, roleId: superAdminRole.id });
    userStoreRoles.assignments.set(assignment1.id, assignment1);
    userStoreRoles.assignments.set(assignment2.id, assignment2);

    const result = await useCase.execute({ actorUserId: 'actor-1', userId: user.id, status: 'disabled' });

    expect(result.isOk()).toBe(true);
  });

  it('permite reactivar a un usuario sin chequear Super Admin', async () => {
    const assignment = UserStoreRole.create({ userId: user.id, storeId: null, roleId: superAdminRole.id });
    userStoreRoles.assignments.set(assignment.id, assignment);
    user.setStatus('disabled', new Date());

    const result = await useCase.execute({ actorUserId: 'actor-1', userId: user.id, status: 'active' });

    expect(result.isOk()).toBe(true);
    expect(user.status).toBe('active');
  });
});
