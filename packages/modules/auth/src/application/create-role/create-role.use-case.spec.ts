import { describe, expect, it, beforeEach } from 'vitest';
import { ValidationError } from '@mitama/core';
import { InMemoryRoleRepository } from '../__test-utils__/in-memory-repositories';
import { InvalidPermissionError, RoleNameAlreadyInUseError } from '../../domain/errors';
import { Role } from '../../domain/role.entity';
import { CreateRoleUseCase } from './create-role.use-case';

describe('CreateRoleUseCase', () => {
  let roles: InMemoryRoleRepository;
  let useCase: CreateRoleUseCase;

  beforeEach(() => {
    roles = new InMemoryRoleRepository();
    useCase = new CreateRoleUseCase(roles);
  });

  it('crea un rol con permisos válidos', async () => {
    const result = await useCase.execute({
      actorUserId: 'actor-1',
      name: 'Operador',
      permissions: ['stores.read', 'settings.read'],
    });

    expect(result.isOk()).toBe(true);
    expect(roles.roles.size).toBe(1);
  });

  it('falla si el nombre ya existe', async () => {
    roles.roles.set('1', Role.create({ name: 'Operador', permissions: [] }));

    const result = await useCase.execute({
      actorUserId: 'actor-1',
      name: 'Operador',
      permissions: [],
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(RoleNameAlreadyInUseError);
    }
  });

  it('falla si un permiso no existe en el catálogo', async () => {
    const result = await useCase.execute({
      actorUserId: 'actor-1',
      name: 'Operador',
      permissions: ['inventado.accion'],
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidPermissionError);
    }
  });

  it('falla si el nombre está vacío', async () => {
    const result = await useCase.execute({
      actorUserId: 'actor-1',
      name: '   ',
      permissions: [],
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });
});
