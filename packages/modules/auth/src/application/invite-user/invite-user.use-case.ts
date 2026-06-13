import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { Email } from '../../domain/email.vo';
import { EmailAlreadyInUseError, RoleNotFoundError } from '../../domain/errors';
import { InvitationToken } from '../../domain/invitation-token.entity';
import type { InvitationTokenRepository } from '../../domain/invitation-token.repository';
import type { RoleRepository } from '../../domain/role.repository';
import { User } from '../../domain/user.entity';
import type { UserRepository } from '../../domain/user.repository';
import { UserStoreRole } from '../../domain/user-store-role.entity';
import { addHours, INVITATION_TOKEN_TTL_HOURS } from '../shared/constants';
import { generateOpaqueToken } from '../shared/token.util';
import type { InviteUserInput, InviteUserOutput } from './invite-user.dto';

export type InviteUserError = ValidationError | EmailAlreadyInUseError | RoleNotFoundError;

/**
 * Crea un usuario `invited` con un rol asignado en una tienda (o global para
 * Super Admin) y emite un token de invitación válido 72h.
 */
export class InviteUserUseCase implements UseCase<InviteUserInput, Result<InviteUserOutput, InviteUserError>> {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly invitationTokens: InvitationTokenRepository,
  ) {}

  async execute(input: InviteUserInput): Promise<Result<InviteUserOutput, InviteUserError>> {
    const emailResult = Email.create(input.email);
    if (emailResult.isErr()) {
      return err(emailResult.error);
    }

    const name = input.name.trim();
    if (!name) {
      return err(new ValidationError('El nombre es obligatorio'));
    }

    const existing = await this.users.findByEmail(emailResult.value);
    if (existing) {
      return err(new EmailAlreadyInUseError(emailResult.value.value));
    }

    const role = await this.roles.findById(input.roleId);
    if (!role) {
      return err(new RoleNotFoundError(input.roleId));
    }

    if (input.storeId === null && !role.isSystem) {
      return err(new ValidationError('Solo el rol Super Admin puede asignarse de forma global, sin tienda'));
    }

    const user = User.create({ email: emailResult.value, name });
    const userStoreRole = UserStoreRole.create({
      userId: user.id,
      storeId: input.storeId,
      roleId: role.id,
    });

    const now = new Date();
    const { plain, hash } = generateOpaqueToken();
    const invitationToken = InvitationToken.create({
      userId: user.id,
      tokenHash: hash,
      expiresAt: addHours(now, INVITATION_TOKEN_TTL_HOURS),
    });

    await this.invitationTokens.create(invitationToken, { user, userStoreRole }, {
      userId: input.actorUserId,
      storeId: input.storeId,
      action: 'user.invited',
      entityType: 'user',
      entityId: user.id,
    });

    return ok({ userId: user.id, invitationToken: plain });
  }
}
