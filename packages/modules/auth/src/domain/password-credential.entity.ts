import { Entity } from '@mitama/core';

interface PasswordCredentialProps {
  userId: string;
  hash: string;
  createdAt: Date;
}

/** Historial de contraseñas: cada cambio crea un registro nuevo, nunca se actualiza. */
export class PasswordCredential extends Entity<PasswordCredentialProps> {
  static create(props: { userId: string; hash: string }): PasswordCredential {
    return new PasswordCredential(crypto.randomUUID(), { ...props, createdAt: new Date() });
  }

  static rehydrate(props: PasswordCredentialProps, id: string): PasswordCredential {
    return new PasswordCredential(id, props);
  }

  get userId(): string {
    return this.props.userId;
  }

  get hash(): string {
    return this.props.hash;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
