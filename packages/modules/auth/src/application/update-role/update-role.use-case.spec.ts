import { describe, expect, it, beforeEach } from 'vitest';
import { InMemoryRoleRepository } from '../__test-utils__/in-memory-repositories';
import {
  InvalidPermissionError,
  RoleNameAlreadyInUseError,
  RoleNotFoundError,
  SystemRoleNotEditableError,
} from '../../domain/errors';
import { Role, SUPER_ADMIN_ROLE_NAME } from '../../domain/role.entity';
import { UpdateRoleUseCase } from './update-role.use-case';

describe('UpdateRoleUseCase', () => {
  let roles: InMemoryRoleRepository;
  let useCase: UpdateRoleUseCase;
  let role: Role;
  let otherRole: Role;

  beforeEach(() => {
    roles = new InMemoryRoleRepository();
    useCase = new UpdateRoleUseCase(roles);

    role = Role.create({ name: 'Operador', permissions: ['stores.read'] });
    roles.roles.set(role.id, role);

    otherRole = Role.create({ name: 'Cajero', permissions: [] });
    roles.roles.set(otherRole.id, otherRole);
  });

  it('actualiza nombre y permisos', async () => {
    const result = await useCase.execute({
      actorUserId: 'actor-1',
      roleId: role.id,
      name: 'Operador de tienda',
      permissions: ['stores.read', 'settings.read'],
    });

    expect(result.isOk()).toBe(true);
    expect(role.name).toBe('Operador de tienda');
    expect(role.permissions).toEqual(['stores.read', 'settings.read']);
  });

  it('falla si el rol no existe', async () => {
    const result = await useCase.execute({ actorUserId: 'actor-1', roleId: 'no-existe', name: 'X' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(RoleNotFoundError);
    }
  });

  it('falla si el rol es de sistema', async () => {
    const systemRole = Role.create({ name: SUPER_ADMIN_ROLE_NAME, isSystem: true, permissions: [] });
    roles.roles.set(systemRole.id, systemRole);

    const result = await useCase.execute({ actorUserId: 'actor-1', roleId: systemRole.id, name: 'X' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(SystemRoleNotEditableError);
    }
  });

  it('falla si el nuevo nombre ya está en uso por otro rol', async () => {
    const result = await useCase.execute({ actorUserId: 'actor-1', roleId: role.id, name: 'Cajero' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(RoleNameAlreadyInUseError);
    }
  });

  it('falla si un permiso no existe en el catálogo', async () => {
    const result = await useCase.execute({
      actorUserId: 'actor-1',
      roleId: role.id,
      permissions: ['inventado.accion'],
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidPermissionError);
    }
  });
});
