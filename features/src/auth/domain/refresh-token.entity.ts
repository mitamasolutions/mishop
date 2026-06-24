import { Entity } from '@mitama/core';

interface RefreshTokenProps {
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

/**
 * Refresh token con familia para rotación y detección de reuso. Cada login
 * inicia una familia nueva; cada refresh rota el token dentro de la misma
 * familia y revoca el anterior.
 */
export class RefreshToken extends Entity<RefreshTokenProps> {
  static create(props: {
    userId: string;
    familyId: string;
    tokenHash: string;
    expiresAt: Date;
  }): RefreshToken {
    return new RefreshToken(crypto.randomUUID(), { ...props, revokedAt: null, createdAt: new Date() });
  }

  static rehydrate(props: RefreshTokenProps, id: string): RefreshToken {
    return new RefreshToken(id, props);
  }

  get userId(): string {
    return this.props.userId;
  }

  get familyId(): string {
    return this.props.familyId;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isExpiredAt(now: Date): boolean {
    return this.props.expiresAt <= now;
  }

  isRevoked(): boolean {
    return this.props.revokedAt !== null;
  }

  revoke(now: Date): void {
    this.props.revokedAt = now;
  }
}
