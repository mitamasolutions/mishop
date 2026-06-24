import { describe, expect, it } from 'vitest';
import {
  InMemoryRoleRepository,
  InMemoryUserRepository,
  InMemoryUserStoreRoleRepository,
} from '../__test-utils__/in-memory-repositories';
import { Email } from '../../domain/email.vo';
import { Role } from '../../domain/role.entity';
import { User } from '../../domain/user.entity';
import { UserStoreRole } from '../../domain/user-store-role.entity';
import { ListUsersUseCase } from './list-users.use-case';

describe('ListUsersUseCase', () => {
  it('lista usuarios con sus asignaciones de rol', async () => {
    const users = new InMemoryUserRepository();
    const roles = new InMemoryRoleRepository();
    const userStoreRoles = new InMemoryUserStoreRoleRepository(roles);
    const useCase = new ListUsersUseCase(users, userStoreRoles);

    const emailResult = Email.create('usuario@ejemplo.mx');
    if (emailResult.isErr()) throw emailResult.error;
    const user = User.create({ email: emailResult.value, name: 'Usuario' });
    users.users.set(user.id, user);

    const role = Role.create({ name: 'Operador', permissions: [] });
    roles.roles.set(role.id, role);
    const assignment = UserStoreRole.create({ userId: user.id, storeId: 'store-1', roleId: role.id });
    userStoreRoles.assignments.set(assignment.id, assignment);

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.storeRoles).toEqual([
        { assignmentId: assignment.id, storeId: 'store-1', roleId: role.id, roleName: 'Operador' },
      ]);
    }
  });
});
