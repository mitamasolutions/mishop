import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { PasswordHasher } from '../domain/password-hasher';

@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return argon2.hash(plain);
  }
}
