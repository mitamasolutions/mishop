import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Cifrador simétrico para credenciales de plugins de pago por tienda
 * (r14 · sprint1_cierre).
 *
 * - Algoritmo: **AES-256-GCM** (autenticado: detecta tampering).
 * - Clave: derivada por SHA-256 de la env `PAYMENTS_ENCRYPTION_KEY` (acepta
 *   secretos arbitrariamente largos sin imponer 32 bytes exactos).
 * - Formato persistido: `v1:<iv-base64>:<tag-base64>:<ciphertext-base64>`.
 *   El prefijo `v1` permite rotar el algoritmo en el futuro sin perder
 *   compatibilidad.
 * - Fail-closed: si la env falta o queda vacía, la API **no inicia**
 *   (`requireCredentialCipher`).
 */
export class CredentialCipher {
  private readonly key: Buffer;

  constructor(secret: string) {
    if (!secret || secret.length === 0) {
      throw new Error('CredentialCipher requiere un secreto no vacío');
    }
    this.key = createHash('sha256').update(secret).digest();
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
  }

  decrypt(payload: string): string {
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
 * Resuelve `PAYMENTS_ENCRYPTION_KEY`. Lanza si falta: la API debe abortar
 * el bootstrap antes de aceptar tráfico (fail-closed).
 */
export function requireCredentialCipher(env: NodeJS.ProcessEnv = process.env): CredentialCipher {
  const secret = env.PAYMENTS_ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    throw new Error(
      'PAYMENTS_ENCRYPTION_KEY ausente o demasiado corta (mínimo 16 caracteres). ' +
        'La API no puede iniciar sin clave para cifrar credenciales de pago (r14 · sprint1_cierre).',
    );
  }
  return new CredentialCipher(secret);
}
