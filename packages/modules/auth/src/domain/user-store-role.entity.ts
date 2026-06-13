import { Entity } from '@mitama/core';

interface UserStoreRoleProps {
  userId: string;
  storeId: string | null;
  roleId: string;
  createdAt: Date;
}

/** Asignación usuario↔rol. `storeId: null` es exclusivo del rol Super Admin (global). */
export class UserStoreRole extends Entity<UserStoreRoleProps> {
  static create(props: { userId: string; storeId: string | null; roleId: string }): UserStoreRole {
    return new UserStoreRole(crypto.randomUUID(), { ...props, createdAt: new Date() });
  }

  static rehydrate(props: UserStoreRoleProps, id: string): UserStoreRole {
    return new UserStoreRole(id, props);
  }

  get userId(): string {
    return this.props.userId;
  }

  get storeId(): string | null {
    return this.props.storeId;
  }

  get roleId(): string {
    return this.props.roleId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
