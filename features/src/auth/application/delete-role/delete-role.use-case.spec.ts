import { describe, expect, it, beforeEach } from 'vitest';
import { InMemoryRoleRepository, InMemoryUserStoreRoleRepository } from '../__test-utils__/in-memory-repositories';
import { RoleInUseError, RoleNotFoundError, SystemRoleNotEditableError } from '../../domain/errors';
import { Role, SUPER_ADMIN_ROLE_NAME } from '../../domain/role.entity';
import { UserStoreRole } from '../../domain/user-store-role.entity';
import { DeleteRoleUseCase } from './delete-role.use-case';

describe('DeleteRoleUseCase', () => {
  let roles: InMemoryRoleRepository;
  let userStoreRoles: InMemoryUserStoreRoleRepository;
  let useCase: DeleteRoleUseCase;
  let role: Role;

  beforeEach(() => {
    roles = new InMemoryRoleRepository();
    userStoreRoles = new InMemoryUserStoreRoleRepository(roles);
    useCase = new DeleteRoleUseCase(roles, userStoreRoles);

    role = Role.create({ name: 'Operador', permissions: [] });
    roles.roles.set(role.id, role);
  });

  it('borra un rol no usado', async () => {
    const result = await useCase.execute({ actorUserId: 'actor-1', roleId: role.id });

    expect(result.isOk()).toBe(true);
    expect(roles.roles.has(role.id)).toBe(false);
  });

  it('falla si el rol no existe', async () => {
    const result = await useCase.execute({ actorUserId: 'actor-1', roleId: 'no-existe' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(RoleNotFoundError);
    }
  });

  it('falla si el rol es de sistema', async () => {
    const systemRole = Role.create({ name: SUPER_ADMIN_ROLE_NAME, isSystem: true, permissions: [] });
    roles.roles.set(systemRole.id, systemRole);

    const result = await useCase.execute({ actorUserId: 'actor-1', roleId: systemRole.id });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(SystemRoleNotEditableError);
    }
  });

  it('falla si el rol está asignado a algún usuario', async () => {
    const assignment = UserStoreRole.create({ userId: 'user-1', storeId: 'store-1', roleId: role.id });
    userStoreRoles.assignments.set(assignment.id, assignment);

    const result = await useCase.execute({ actorUserId: 'actor-1', roleId: role.id });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(RoleInUseError);
    }
  });
});
