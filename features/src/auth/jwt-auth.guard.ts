import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, type AuthenticatedUser } from '@mitama/contracts';
import type { AccessTokenIssuer } from './domain/access-token-issuer';
import { AUTH_TOKENS } from './auth.tokens';

interface AuthRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
}

/** Valida el access token JWT y popula `request.user`. Rutas `@Public()` se omiten. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_TOKENS.accessTokenIssuer) private readonly accessTokenIssuer: AccessTokenIssuer,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const header = request.headers.authorization;
    const value = Array.isArray(header) ? header[0] : header;
    const token = value?.startsWith('Bearer ') ? value.slice('Bearer '.length) : undefined;
    if (!token) {
      throw new UnauthorizedException('Falta el token de acceso');
    }

    try {
      const payload = this.accessTokenIssuer.verify(token);
      request.user = {
        id: payload.sub,
        email: payload.email,
        isSuperAdmin: payload.isSuperAdmin,
        storeRoles: payload.storeRoles,
      };
    } catch {
      throw new UnauthorizedException('El token de acceso es inválido o expiró');
    }

    return true;
  }
}
