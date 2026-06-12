import { Entity } from '@mitama/core';
import { Email } from './email.vo';

interface UserProps {
  email: Email;
  passwordHash: string;
  createdAt: Date;
}

export class User extends Entity<UserProps> {
  static create(props: { email: Email; passwordHash: string }): User {
    return new User(crypto.randomUUID(), { ...props, createdAt: new Date() });
  }

  /** Reconstruye la entidad desde persistencia, sin regenerar id ni fechas. */
  static rehydrate(props: UserProps, id: string): User {
    return new User(id, props);
  }

  get email(): Email {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
