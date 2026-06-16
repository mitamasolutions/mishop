import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Cifrador general para settings sensibles (r14 · sprint1_cierre).
 *
 * `SETTINGS_ENCRYPTION_KEY` es opcional fuera de producción: sin clave persiste
 * JSON plano; con clave usa AES-256-GCM. La validación global la exige en prod.
 */
export class CredentialCipher {
  private readonly key: Buffer | null;

  constructor(secret?: string | null) {
    this.key = secret && secret.length > 0 ? createHash('sha256').update(secret).digest() : null;
  }

  get enabled(): boolean {
    return this.key !== null;
  }

  encrypt(plaintext: string): string {
    if (!this.key) return plaintext;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
  }

  decrypt(payload: string): string {
    if (!payload.startsWith('v1:')) return payload;
    if (!this.key) {
      throw new Error('CredentialCipher: payload cifrado requiere SETTINGS_ENCRYPTION_KEY');
    }
    const parts = payload.split(':');
    if (parts.length !== 4 || parts[0] !== 'v1' || !parts[1] || !parts[2] || !parts[3]) {
      throw new Error('CredentialCipher: formato cifrado no soportado');
    }
    const iv = Buffer.from(parts[1], 'base64');
    const tag = Buffer.from(parts[2], 'base64');
    const ciphertext = Buffer.from(parts[3], 'base64');
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf8');
  }

  encryptJson<T>(value: T): string {
    return this.encrypt(JSON.stringify(value));
  }

  decryptJson<T>(payload: string): T {
    return JSON.parse(this.decrypt(payload)) as T;
  }
}

/**
 * Resuelve `SETTINGS_ENCRYPTION_KEY`. Fuera de producción, sin clave guarda/lee
 * en plano; en producción la validación global falla antes de componer el módulo.
 */
export function resolveCredentialCipher(env: NodeJS.ProcessEnv = process.env): CredentialCipher {
  return new CredentialCipher(env.SETTINGS_ENCRYPTION_KEY);
}
