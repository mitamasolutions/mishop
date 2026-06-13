import { describe, expect, it, beforeEach } from 'vitest';
import { InMemoryRoleRepository } from '../__test-utils__/in-memory-repositories';
import { Role } from '../../domain/role.entity';
import { ListRolesUseCase } from './list-roles.use-case';

describe('ListRolesUseCase', () => {
  let roles: InMemoryRoleRepository;
  let useCase: ListRolesUseCase;

  beforeEach(() => {
    roles = new InMemoryRoleRepository();
    useCase = new ListRolesUseCase(roles);
  });

  it('lista todos los roles', async () => {
    const role = Role.create({ name: 'Operador', permissions: ['stores.read'] });
    roles.roles.set(role.id, role);

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.name).toBe('Operador');
    }
  });

  it('retorna lista vacía si no hay roles', async () => {
    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(0);
    }
  });
});
