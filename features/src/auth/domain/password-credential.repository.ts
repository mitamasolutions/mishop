import type { RecordActivityInput } from '../../activity-log';
import { PasswordCredential } from './password-credential.entity';

/** Puerto de persistencia del historial de contraseñas. */
export interface PasswordCredentialRepository {
  /** Devuelve las credenciales más recientes del usuario, más nueva primero. */
  findRecentByUserId(userId: string, limit: number): Promise<PasswordCredential[]>;
  /** Inserta una credencial nueva (las anteriores se conservan, nunca se borran). */
  create(credential: PasswordCredential, activity: RecordActivityInput): Promise<void>;
}
