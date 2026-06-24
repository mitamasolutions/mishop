import type { RecordActivityInput } from '../../activity-log';
import { RefreshToken } from './refresh-token.entity';
import { User } from './user.entity';

/** Puerto de persistencia de refresh tokens (familias de sesión). */
export interface RefreshTokenRepository {
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;

  /** Crea el primer token de una familia (login). Actualiza el usuario (reset de intentos) en la misma transacción. */
  create(token: RefreshToken, user: User, activity: RecordActivityInput): Promise<void>;

  /** Rota: revoca `previous` y crea `next` (misma familia) en una sola transacción. */
  rotate(previous: RefreshToken, next: RefreshToken, activity: RecordActivityInput): Promise<void>;

  /** Revoca todos los tokens vigentes de una familia (logout o detección de reuso). */
  revokeFamily(familyId: string, activity: RecordActivityInput): Promise<void>;
}
