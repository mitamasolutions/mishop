export interface InviteUserInput {
  actorUserId: string;
  email: string;
  name: string;
  roleId: string;
  /** `null` solo para el rol Super Admin (global, no scoped por tienda). */
  storeId: string | null;
}

export interface InviteUserOutput {
  userId: string;
  /** Token en claro, de un solo uso, válido 72h. El "envío" se registra en activity log. */
  invitationToken: string;
}
