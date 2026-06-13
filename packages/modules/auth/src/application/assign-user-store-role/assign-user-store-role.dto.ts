export interface AssignUserStoreRoleInput {
  actorUserId: string;
  userId: string;
  roleId: string;
  storeId: string | null;
}

export interface AssignUserStoreRoleOutput {
  assignmentId: string;
}
