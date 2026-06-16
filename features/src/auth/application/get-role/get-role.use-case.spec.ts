import { describe, expect, it, beforeEach } from 'vitest';
import { InMemoryRoleRepository } from '../__test-utils__/in-memory-repositories';
import { RoleNotFoundError } from '../../domain/errors';
import { Role } from '../../domain/role.entity';
import { GetRoleUseCase } from './get-role.use-case';

describe('GetRoleUseCase', () => {
  let roles: InMemoryRoleRepository;
  let useCase: GetRoleUseCase;

  beforeEach(() => {
    roles = new InMemoryRoleRepository();
    useCase = new GetRoleUseCase(roles);
  });

  it('retorna el rol por id', async () => {
    const role = Role.create({ name: 'Operador', permissions: [] });
    roles.roles.set(role.id, role);

    const result = await useCase.execute(role.id);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.name).toBe('Operador');
    }
  });

  it('falla si el rol no existe', async () => {
    const result = await useCase.execute('no-existe');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(RoleNotFoundError);
    }
  });
});
