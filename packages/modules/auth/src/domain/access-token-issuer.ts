import type { AuthenticatedStoreRole } from '@mitama/contracts';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  isSuperAdmin: boolean;
  storeRoles: AuthenticatedStoreRole[];
}

/** Puerto de emisión/verificación del access token JWT (15 min). infra/ lo implementa con `@nestjs/jwt`. */
export interface AccessTokenIssuer {
  sign(payload: AccessTokenPayload): string;
  verify(token: string): AccessTokenPayload;
}
