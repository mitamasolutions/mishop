import { Entity } from '@mitama/core';

interface InvitationTokenProps {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

/** Token de invitación de un solo uso, válido 72 horas. */
export class InvitationToken extends Entity<InvitationTokenProps> {
  static create(props: { userId: string; tokenHash: string; expiresAt: Date }): InvitationToken {
    return new InvitationToken(crypto.randomUUID(), { ...props, acceptedAt: null, createdAt: new Date() });
  }

  static rehydrate(props: InvitationTokenProps, id: string): InvitationToken {
    return new InvitationToken(id, props);
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

  get acceptedAt(): Date | null {
    return this.props.acceptedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isExpiredAt(now: Date): boolean {
    return this.props.expiresAt <= now;
  }

  isAccepted(): boolean {
    return this.props.acceptedAt !== null;
  }

  accept(now: Date): void {
    this.props.acceptedAt = now;
  }
}
