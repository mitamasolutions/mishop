import { err, EventBus, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { UserRegisteredEvent } from '@mitama/contracts';
import { Email } from '../../domain/email.vo';
import { PlainPassword } from '../../domain/plain-password.vo';
import { User } from '../../domain/user.entity';
import { EmailAlreadyInUseError } from '../../domain/errors';
import type { UserRepository } from '../../domain/user.repository';
import type { PasswordHasher } from '../../domain/password-hasher';
import type { RegisterUserInput, RegisterUserOutput } from './register-user.dto';

export type RegisterUserError = ValidationError | EmailAlreadyInUseError;

/**
 * Caso de uso de ejemplo: demuestra el flujo completo de la arquitectura.
 * Depende solo de puertos (interfaces de domain) y del bus de eventos de core.
 */
export class RegisterUserUseCase
  implements UseCase<RegisterUserInput, Result<RegisterUserOutput, RegisterUserError>>
{
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly events: EventBus,
  ) {}

  async execute(
    input: RegisterUserInput,
  ): Promise<Result<RegisterUserOutput, RegisterUserError>> {
    const emailResult = Email.create(input.email);
    if (emailResult.isErr()) {
      return err(emailResult.error);
    }

    const passwordResult = PlainPassword.create(input.password);
    if (passwordResult.isErr()) {
      return err(passwordResult.error);
    }

    const email = emailResult.value;
    const existing = await this.users.findByEmail(email);
    if (existing) {
      return err(new EmailAlreadyInUseError(email.value));
    }

    const passwordHash = await this.passwordHasher.hash(passwordResult.value.value);
    const user = User.create({ email, passwordHash });
    await this.users.save(user);

    await this.events.publish(
      new UserRegisteredEvent({ userId: user.id, email: email.value }),
    );

    return ok({ userId: user.id, email: email.value });
  }
}
