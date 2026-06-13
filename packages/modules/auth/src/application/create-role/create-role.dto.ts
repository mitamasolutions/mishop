export interface CreateRoleInput {
  actorUserId: string;
  name: string;
  permissions: string[];
}

export interface CreateRoleOutput {
  roleId: string;
}
