export interface UpdateRoleInput {
  actorUserId: string;
  roleId: string;
  name?: string;
  permissions?: string[];
}
