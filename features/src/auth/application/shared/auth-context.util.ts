import type { AuthenticatedStoreRole } from '@mitama/contracts';
import type { UserStoreRoleWithRole } from '../../domain/user-store-role.repository';

export interface AuthContext {
  isSuperAdmin: boolean;
  storeRoles: AuthenticatedStoreRole[];
}

/** Deriva `isSuperAdmin` y los roles por tienda a partir de las asignaciones del usuario. */
export function buildAuthContext(assignments: UserStoreRoleWithRole[]): AuthContext {
  const isSuperAdmin = assignments.some((a) => a.assignment.storeId === null && a.roleIsSystem);
  const storeRoles: AuthenticatedStoreRole[] = [];
  for (const a of assignments) {
    const storeId = a.assignment.storeId;
    if (storeId !== null) {
      storeRoles.push({ storeId, roleId: a.assignment.roleId, permissions: a.permissions });
    }
  }

  return { isSuperAdmin, storeRoles };
}
