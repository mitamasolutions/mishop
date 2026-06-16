import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { InvalidOrExpiredTokenError, UserNotFoundError } from '../../domain/errors';
import type { InvitationTokenRepository } from '../../domain/invitation-token.repository';
import { PasswordCredential } from '../../domain/password-credential.entity';
import type { PasswordHasher } from '../../domain/password-hasher';
import { PlainPassword } from '../../domain/plain-password.vo';
import type { UserRepository } from '../../domain/user.repository';
import { hashToken } from '../shared/token.util';
import type { AcceptInvitationInput } from './accept-invitation.dto';

export type AcceptInvitationError = ValidationError | InvalidOrExpiredTokenError | UserNotFoundError;

/** Activa al usuario invitado y crea su primera credencial a partir del token recibido. */
export class AcceptInvitationUseCase implements UseCase<AcceptInvitationInput, Result<void, AcceptInvitationError>> {
  constructor(
    private readonly users: UserRepository,
    private readonly invitationTokens: InvitationTokenRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: AcceptInvitationInput): Promise<Result<void, AcceptInvitationError>> {
    const tokenHash = hashToken(input.token);
    const invitationToken = await this.invitationTokens.findByTokenHash(tokenHash);

    const now = new Date();
    if (!invitationToken || invitationToken.isExpiredAt(now) || invitationToken.isAccepted()) {
      return err(new InvalidOrExpiredTokenError());
    }

    const passwordResult = PlainPassword.create(input.password);
    if (passwordResult.isErr()) {
      return err(passwordResult.error);
    }

    const user = await this.users.findById(invitationToken.userId);
    if (!user) {
      return err(new UserNotFoundError(invitationToken.userId));
    }

    const hash = await this.passwordHasher.hash(passwordResult.value.value);
    const credential = PasswordCredential.create({ userId: user.id, hash });

    invitationToken.accept(now);
    user.activate(now);

    await this.invitationTokens.accept(invitationToken, { user, credential }, {
      userId: user.id,
      storeId: null,
      action: 'user.invitation_accepted',
      entityType: 'user',
      entityId: user.id,
    });

    return ok(undefined);
  }
}
