import type { RecordActivityInput } from '../../activity-log';
import { PasswordCredential } from './password-credential.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { User } from './user.entity';

/** Puerto de persistencia de tokens de recuperación de contraseña. */
export interface PasswordResetTokenRepository {
  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;

  create(token: PasswordResetToken, activity: RecordActivityInput): Promise<void>;

  /** Marca el token usado, crea la credencial nueva y reactiva al usuario si estaba bloqueado, en una transacción. */
  consume(
    token: PasswordResetToken,
    options: { user: User; credential: PasswordCredential },
    activity: RecordActivityInput,
  ): Promise<void>;
}
