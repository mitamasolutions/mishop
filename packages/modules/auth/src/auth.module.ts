/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 * Los puertos de domain se resuelven a adapters de infra vía tokens.
 */
import { Module } from '@nestjs/common';
import { EVENT_BUS } from '@mitama/contracts';
import type { EventBus } from '@mitama/core';
import { AUTH_TOKENS } from './auth.tokens';
import { RegisterUserUseCase } from './application/register-user/register-user.use-case';
import type { UserRepository } from './domain/user.repository';
import type { PasswordHasher } from './domain/password-hasher';
import { PrismaUserRepository } from './infra/prisma-user.repository';
import { BcryptPasswordHasher } from './infra/bcrypt-password-hasher';
import { AuthController } from './http/auth.controller';

@Module({
  controllers: [AuthController],
  providers: [
    { provide: AUTH_TOKENS.userRepository, useClass: PrismaUserRepository },
    { provide: AUTH_TOKENS.passwordHasher, useClass: BcryptPasswordHasher },
    {
      provide: RegisterUserUseCase,
      useFactory: (users: UserRepository, hasher: PasswordHasher, events: EventBus) =>
        new RegisterUserUseCase(users, hasher, events),
      inject: [AUTH_TOKENS.userRepository, AUTH_TOKENS.passwordHasher, EVENT_BUS],
    },
  ],
})
export class AuthModule {}
