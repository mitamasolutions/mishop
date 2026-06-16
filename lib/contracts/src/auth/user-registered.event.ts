import type { DomainEvent } from '@mitama/core';

export const USER_REGISTERED = 'auth.user.registered';

export interface UserRegisteredPayload {
  userId: string;
  email: string;
}

export class UserRegisteredEvent implements DomainEvent<UserRegisteredPayload> {
  readonly name = USER_REGISTERED;
  readonly occurredAt = new Date();

  constructor(readonly payload: UserRegisteredPayload) {}
}
