import { Entity } from '@mitama/core';
import { Email } from './email.vo';

export type UserStatus = 'invited' | 'active' | 'locked' | 'disabled';

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;

interface UserProps {
  email: Email;
  name: string;
  status: UserStatus;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class User extends Entity<UserProps> {
  static create(props: { email: Email; name: string }): User {
    const now = new Date();
    return new User(crypto.randomUUID(), {
      email: props.email,
      name: props.name,
      status: 'invited',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Reconstruye la entidad desde persistencia, sin regenerar id ni fechas. */
  static rehydrate(props: UserProps, id: string): User {
    return new User(id, props);
  }

  get email(): Email {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get failedLoginAttempts(): number {
    return this.props.failedLoginAttempts;
  }

  get lockedUntil(): Date | null {
    return this.props.lockedUntil;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** `true` si la cuenta sigue bloqueada en el momento `now`. */
  isLockedAt(now: Date): boolean {
    return this.props.status === 'locked' && !!this.props.lockedUntil && this.props.lockedUntil > now;
  }

  /** Incrementa el contador de intentos fallidos; bloquea la cuenta al llegar al máximo. */
  recordFailedLogin(now: Date): void {
    this.props.failedLoginAttempts += 1;
    this.props.updatedAt = now;
    if (this.props.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      this.props.status = 'locked';
      this.props.lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60_000);
    }
  }

  /** Resetea el contador tras un login exitoso y levanta el bloqueo si lo había. */
  recordSuccessfulLogin(now: Date): void {
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = null;
    if (this.props.status === 'locked') {
      this.props.status = 'active';
    }
    this.props.updatedAt = now;
  }

  /** Pasa de `invited` a `active` al aceptar una invitación. */
  activate(now: Date): void {
    this.props.status = 'active';
    this.props.updatedAt = now;
  }

  setStatus(status: UserStatus, now: Date): void {
    this.props.status = status;
    if (status !== 'locked') {
      this.props.lockedUntil = null;
    }
    this.props.updatedAt = now;
  }
}
