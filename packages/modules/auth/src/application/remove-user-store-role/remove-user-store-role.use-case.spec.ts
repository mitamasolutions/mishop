import { describe, expect, it, beforeEach } from 'vitest';
import { InMemoryRoleRepository, InMemoryUserStoreRoleRepository } from '../__test-utils__/in-memory-repositories';
import { LastSuperAdminError, UserStoreRoleNotFoundError } from '../../domain/errors';
import { Role, SUPER_ADMIN_ROLE_NAME } from '../../domain/role.entity';
import { UserStoreRole } from '../../domain/user-store-role.entity';
import { RemoveUserStoreRoleUseCase } from './remove-user-store-role.use-case';

describe('RemoveUserStoreRoleUseCase', () => {
  let roles: InMemoryRoleRepository;
  let userStoreRoles: InMemoryUserStoreRoleRepository;
  let useCase: RemoveUserStoreRoleUseCase;
  let superAdminRole: Role;

  beforeEach(() => {
    roles = new InMemoryRoleRepository();
    userStoreRoles = new InMemoryUserStoreRoleRepository(roles);
    useCase = new RemoveUserStoreRoleUseCase(roles, userStoreRoles);

    superAdminRole = Role.create({ name: SUPER_ADMIN_ROLE_NAME, isSystem: true, permissions: [] });
    roles.roles.set(superAdminRole.id, superAdminRole);
  });

  it('quita una asignación de tienda', async () => {
    const storeRole = Role.create({ name: 'Operador', permissions: [] });
    roles.roles.set(storeRole.id, storeRole);
    const assignment = UserStoreRole.create({ userId: 'user-1', storeId: 'store-1', roleId: storeRole.id });
    userStoreRoles.assignments.set(assignment.id, assignment);

    const result = await useCase.execute({ actorUserId: 'actor-1', assignmentId: assignment.id });

    expect(result.isOk()).toBe(true);
    expect(userStoreRoles.assignments.has(assignment.id)).toBe(false);
  });

  it('falla si la asignación no existe', async () => {
    const result = await useCase.execute({ actorUserId: 'actor-1', assignmentId: 'no-existe' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(UserStoreRoleNotFoundError);
    }
  });

  it('falla si es la última asignación global de Super Admin', async () => {
    const assignment = UserStoreRole.create({ userId: 'user-1', storeId: null, roleId: superAdminRole.id });
    userStoreRoles.assignments.set(assignment.id, assignment);

    const result = await useCase.execute({ actorUserId: 'actor-1', assignmentId: assignment.id });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(LastSuperAdminError);
    }
  });

  it('permite quitar Super Admin si hay otro asignado globalmente', async () => {
    const assignment1 = UserStoreRole.create({ userId: 'user-1', storeId: null, roleId: superAdminRole.id });
    const assignment2 = UserStoreRole.create({ userId: 'user-2', storeId: null, roleId: superAdminRole.id });
    userStoreRoles.assignments.set(assignment1.id, assignment1);
    userStoreRoles.assignments.set(assignment2.id, assignment2);

    const result = await useCase.execute({ actorUserId: 'actor-1', assignmentId: assignment1.id });

    expect(result.isOk()).toBe(true);
  });
});
