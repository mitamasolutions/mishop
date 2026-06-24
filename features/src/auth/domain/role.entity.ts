import { Entity } from '@mitama/core';
import type { Permission } from '@mitama/contracts';

export const SUPER_ADMIN_ROLE_NAME = 'Super Admin';

interface RoleProps {
  name: string;
  isSystem: boolean;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

/** Catálogo de roles. El rol Super Admin (`isSystem: true`) no es editable ni borrable. */
export class Role extends Entity<RoleProps> {
  static create(props: { name: string; isSystem?: boolean; permissions: Permission[] }): Role {
    const now = new Date();
    return new Role(crypto.randomUUID(), {
      name: props.name,
      isSystem: props.isSystem ?? false,
      permissions: props.permissions,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: RoleProps, id: string): Role {
    return new Role(id, props);
  }

  get name(): string {
    return this.props.name;
  }

  get isSystem(): boolean {
    return this.props.isSystem;
  }

  get permissions(): Permission[] {
    return this.props.permissions;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  update(changes: { name?: string; permissions?: Permission[] }): void {
    if (changes.name !== undefined) {
      this.props.name = changes.name;
    }
    if (changes.permissions !== undefined) {
      this.props.permissions = changes.permissions;
    }
    this.props.updatedAt = new Date();
  }
}
