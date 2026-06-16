import { describe, expect, it } from 'vitest';
import { CredentialCipher, resolveCredentialCipher } from './credential-cipher';

describe('CredentialCipher (AES-256-GCM)', () => {
  it('sin SETTINGS_ENCRYPTION_KEY guarda y lee JSON en plano', () => {
    const cipher = resolveCredentialCipher({});
    const original = { apiKey: 'sk_plain' };
    const stored = cipher.encryptJson(original);

    expect(cipher.enabled).toBe(false);
    expect(stored).toBe(JSON.stringify(original));
    expect(cipher.decryptJson<typeof original>(stored)).toEqual(original);
  });

  it('cifra y descifra JSON round-trip', () => {
    const cipher = new CredentialCipher('a-secret-of-sufficient-length-and-entropy');
    const original = { apiKey: 'sk_live_xxx', publicKey: 'pk_live_yyy' };
    const encrypted = cipher.encryptJson(original);
    expect(encrypted.startsWith('v1:')).toBe(true);
    expect(encrypted).not.toContain('sk_live_xxx');
    const decrypted = cipher.decryptJson<typeof original>(encrypted);
    expect(decrypted).toEqual(original);
  });

  it('detecta tampering (auth tag inválido)', () => {
    const cipher = new CredentialCipher('a-secret-of-sufficient-length-and-entropy');
    const encrypted = cipher.encrypt('hola');
    const [prefix, iv, tag, _ct] = encrypted.split(':');
    const tampered = [prefix, iv, tag, Buffer.from('xxx').toString('base64')].join(':');
    expect(() => cipher.decrypt(tampered)).toThrow();
    // Tag distinto:
    expect(() => cipher.decrypt(encrypted.replace(tag, Buffer.from('00'.repeat(16), 'hex').toString('base64')))).toThrow();
  });
});
