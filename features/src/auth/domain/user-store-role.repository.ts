import type { RecordActivityInput } from '@mitama/activity-log';
import type { Permission } from '@mitama/contracts';
import { UserStoreRole } from './user-store-role.entity';

/** Información agregada de una asignación, con datos del rol para construir el JWT. */
export interface UserStoreRoleWithRole {
  assignment: UserStoreRole;
  roleName: string;
  roleIsSystem: boolean;
  permissions: Permission[];
}

/** Puerto de persistencia de asignaciones usuario↔rol por tienda. */
export interface UserStoreRoleRepository {
  findById(id: string): Promise<UserStoreRole | null>;
  findByUserId(userId: string): Promise<UserStoreRoleWithRole[]>;
  findByRoleId(roleId: string): Promise<UserStoreRole[]>;
  /** Cantidad de asignaciones globales (`storeId: null`) de un rol (para proteger al último Super Admin). */
  countGlobalAssignments(roleId: string): Promise<number>;
  create(assignment: UserStoreRole, activity: RecordActivityInput): Promise<void>;
  delete(id: string, activity: RecordActivityInput): Promise<void>;
}
