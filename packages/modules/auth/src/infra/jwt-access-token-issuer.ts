import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AccessTokenIssuer, AccessTokenPayload } from '../domain/access-token-issuer';

/** Emite y verifica access tokens JWT (15 min) firmados con `JWT_SECRET`. */
@Injectable()
export class JwtAccessTokenIssuer implements AccessTokenIssuer {
  constructor(private readonly jwt: JwtService) {}

  sign(payload: AccessTokenPayload): string {
    return this.jwt.sign(payload);
  }

  verify(token: string): AccessTokenPayload {
    return this.jwt.verify<AccessTokenPayload>(token);
  }
}
