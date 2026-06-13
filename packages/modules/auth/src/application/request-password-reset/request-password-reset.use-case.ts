import { ok, Result, UseCase } from '@mitama/core';
import { Email } from '../../domain/email.vo';
import { PasswordResetToken } from '../../domain/password-reset-token.entity';
import type { PasswordResetTokenRepository } from '../../domain/password-reset-token.repository';
import type { UserRepository } from '../../domain/user.repository';
import { addHours, PASSWORD_RESET_TOKEN_TTL_HOURS } from '../shared/constants';
import { generateOpaqueToken } from '../shared/token.util';
import type { RequestPasswordResetInput } from './request-password-reset.dto';

export interface RequestPasswordResetOutput {
  /** Solo presente si el email correspondía a una cuenta válida (para el "envío" simulado por log). */
  token?: string;
}

/**
 * Genera un token de recuperación de un solo uso (1h) si el email existe.
 * Siempre responde `ok` para no revelar si una cuenta existe; el "envío" del
 * email queda como entrada de activity log.
 */
export class RequestPasswordResetUseCase
  implements UseCase<RequestPasswordResetInput, Result<RequestPasswordResetOutput, never>>
{
  constructor(
    private readonly users: UserRepository,
    private readonly passwordResetTokens: PasswordResetTokenRepository,
  ) {}

  async execute(input: RequestPasswordResetInput): Promise<Result<RequestPasswordResetOutput, never>> {
    const emailResult = Email.create(input.email);
    if (emailResult.isErr()) {
      return ok({});
    }

    const user = await this.users.findByEmail(emailResult.value);
    if (!user || user.status === 'disabled' || user.status === 'invited') {
      return ok({});
    }

    const now = new Date();
    const { plain, hash } = generateOpaqueToken();
    const token = PasswordResetToken.create({
      userId: user.id,
      tokenHash: hash,
      expiresAt: addHours(now, PASSWORD_RESET_TOKEN_TTL_HOURS),
    });

    await this.passwordResetTokens.create(token, {
      userId: user.id,
      storeId: null,
      action: 'auth.password_reset_requested',
      entityType: 'user',
      entityId: user.id,
    });

    return ok({ token: plain });
  }
}
