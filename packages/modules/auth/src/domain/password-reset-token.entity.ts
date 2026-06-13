import { Entity } from '@mitama/core';

interface PasswordResetTokenProps {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

/** Token de recuperación de contraseña de un solo uso, válido 1 hora. */
export class PasswordResetToken extends Entity<PasswordResetTokenProps> {
  static create(props: { userId: string; tokenHash: string; expiresAt: Date }): PasswordResetToken {
    return new PasswordResetToken(crypto.randomUUID(), { ...props, usedAt: null, createdAt: new Date() });
  }

  static rehydrate(props: PasswordResetTokenProps, id: string): PasswordResetToken {
    return new PasswordResetToken(id, props);
  }

  get userId(): string {
    return this.props.userId;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get usedAt(): Date | null {
    return this.props.usedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isExpiredAt(now: Date): boolean {
    return this.props.expiresAt <= now;
  }

  isUsed(): boolean {
    return this.props.usedAt !== null;
  }

  markUsed(now: Date): void {
    this.props.usedAt = now;
  }
}
