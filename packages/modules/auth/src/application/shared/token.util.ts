import { createHash, randomBytes } from 'node:crypto';

/** Genera un token opaco aleatorio junto con su hash sha256 (lo único que se persiste). */
export function generateOpaqueToken(): { plain: string; hash: string } {
  const plain = randomBytes(32).toString('hex');
  return { plain, hash: hashToken(plain) };
}

export function hashToken(plain: string): string {
  return createHash('sha256').update(plain).digest('hex');
}
