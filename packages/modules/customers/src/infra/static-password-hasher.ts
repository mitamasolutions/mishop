import type { PasswordHasher } from '../domain/password-hasher';

export class StaticPasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }
}
