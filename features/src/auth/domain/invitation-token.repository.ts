import type { RecordActivityInput } from '@mitama/activity-log';
import { InvitationToken } from './invitation-token.entity';
import { PasswordCredential } from './password-credential.entity';
import { User } from './user.entity';
import { UserStoreRole } from './user-store-role.entity';

/** Puerto de persistencia de tokens de invitación. */
export interface InvitationTokenRepository {
  findByTokenHash(tokenHash: string): Promise<InvitationToken | null>;

  /** Crea el usuario invitado, su asignación de rol y el token, en una transacción. */
  create(
    token: InvitationToken,
    options: { user: User; userStoreRole: UserStoreRole },
    activity: RecordActivityInput,
  ): Promise<void>;

  /** Marca el token aceptado, activa al usuario y crea su primera credencial, en una transacción. */
  accept(
    token: InvitationToken,
    options: { user: User; credential: PasswordCredential },
    activity: RecordActivityInput,
  ): Promise<void>;
}
