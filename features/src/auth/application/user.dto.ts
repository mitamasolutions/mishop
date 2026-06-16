import type { User, UserStatus } from '../domain/user.entity';
import type { UserStoreRoleWithRole } from '../domain/user-store-role.repository';

export interface UserStoreRoleOutput {
  assignmentId: string;
  storeId: string | null;
  roleId: string;
  roleName: string;
}

export interface UserOutput {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  storeRoles: UserStoreRoleOutput[];
}

export function toUserOutput(user: User, assignments: UserStoreRoleWithRole[]): UserOutput {
  return {
    id: user.id,
    email: user.email.value,
    name: user.name,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    storeRoles: assignments.map((a) => ({
      assignmentId: a.assignment.id,
      storeId: a.assignment.storeId,
      roleId: a.assignment.roleId,
      roleName: a.roleName,
    })),
  };
}
