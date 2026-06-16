/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 * Los puertos de domain se resuelven a adapters de infra vía tokens.
 */
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { createModuleProviders } from '@mitama/contracts';
import { AUTH_TOKENS } from './auth.tokens';
import { ACCESS_TOKEN_TTL } from './application/shared/constants';

import { PrismaUserRepository } from './infra/prisma-user.repository';
import { PrismaPasswordCredentialRepository } from './infra/prisma-password-credential.repository';
import { PrismaRefreshTokenRepository } from './infra/prisma-refresh-token.repository';
import { PrismaRoleRepository } from './infra/prisma-role.repository';
import { PrismaUserStoreRoleRepository } from './infra/prisma-user-store-role.repository';
import { PrismaInvitationTokenRepository } from './infra/prisma-invitation-token.repository';
import { PrismaPasswordResetTokenRepository } from './infra/prisma-password-reset-token.repository';
import { Argon2PasswordHasher } from './infra/argon2-password-hasher';
import { JwtAccessTokenIssuer } from './infra/jwt-access-token-issuer';

import { LoginUseCase } from './application/login/login.use-case';
import { RefreshSessionUseCase } from './application/refresh-session/refresh-session.use-case';
import { LogoutUseCase } from './application/logout/logout.use-case';
import { RequestPasswordResetUseCase } from './application/request-password-reset/request-password-reset.use-case';
import { ResetPasswordUseCase } from './application/reset-password/reset-password.use-case';
import { AcceptInvitationUseCase } from './application/accept-invitation/accept-invitation.use-case';
import { ChangePasswordUseCase } from './application/change-password/change-password.use-case';
import { InviteUserUseCase } from './application/invite-user/invite-user.use-case';
import { ListUsersUseCase } from './application/list-users/list-users.use-case';
import { GetUserUseCase } from './application/get-user/get-user.use-case';
import { UpdateUserStatusUseCase } from './application/update-user-status/update-user-status.use-case';
import { AssignUserStoreRoleUseCase } from './application/assign-user-store-role/assign-user-store-role.use-case';
import { RemoveUserStoreRoleUseCase } from './application/remove-user-store-role/remove-user-store-role.use-case';
import { CreateRoleUseCase } from './application/create-role/create-role.use-case';
import { UpdateRoleUseCase } from './application/update-role/update-role.use-case';
import { DeleteRoleUseCase } from './application/delete-role/delete-role.use-case';
import { ListRolesUseCase } from './application/list-roles/list-roles.use-case';
import { GetRoleUseCase } from './application/get-role/get-role.use-case';

import { AuthController } from './http/auth.controller';
import { UsersController } from './http/users.controller';
import { RolesController } from './http/roles.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';

const T = AUTH_TOKENS;

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: ACCESS_TOKEN_TTL },
      }),
    }),
  ],
  controllers: [AuthController, UsersController, RolesController],
  providers: [
    ...createModuleProviders([
      { provide: T.userRepository, useClass: PrismaUserRepository },
      { provide: T.passwordCredentialRepository, useClass: PrismaPasswordCredentialRepository },
      { provide: T.refreshTokenRepository, useClass: PrismaRefreshTokenRepository },
      { provide: T.roleRepository, useClass: PrismaRoleRepository },
      { provide: T.userStoreRoleRepository, useClass: PrismaUserStoreRoleRepository },
      { provide: T.invitationTokenRepository, useClass: PrismaInvitationTokenRepository },
      { provide: T.passwordResetTokenRepository, useClass: PrismaPasswordResetTokenRepository },
      { provide: T.passwordHasher, useClass: Argon2PasswordHasher },
      { provide: T.accessTokenIssuer, useClass: JwtAccessTokenIssuer },
      {
        useCase: LoginUseCase,
        inject: [
          T.userRepository,
          T.passwordCredentialRepository,
          T.refreshTokenRepository,
          T.userStoreRoleRepository,
          T.passwordHasher,
          T.accessTokenIssuer,
        ],
      },
      { useCase: RefreshSessionUseCase, inject: [T.userRepository, T.refreshTokenRepository, T.userStoreRoleRepository, T.accessTokenIssuer] },
      { useCase: LogoutUseCase, inject: [T.refreshTokenRepository] },
      { useCase: RequestPasswordResetUseCase, inject: [T.userRepository, T.passwordResetTokenRepository] },
      { useCase: ResetPasswordUseCase, inject: [T.userRepository, T.passwordCredentialRepository, T.passwordResetTokenRepository, T.passwordHasher] },
      { useCase: AcceptInvitationUseCase, inject: [T.userRepository, T.invitationTokenRepository, T.passwordHasher] },
      { useCase: ChangePasswordUseCase, inject: [T.userRepository, T.passwordCredentialRepository, T.passwordHasher] },
      { useCase: InviteUserUseCase, inject: [T.userRepository, T.roleRepository, T.invitationTokenRepository] },
      { useCase: ListUsersUseCase, inject: [T.userRepository, T.userStoreRoleRepository] },
      { useCase: GetUserUseCase, inject: [T.userRepository, T.userStoreRoleRepository] },
      { useCase: UpdateUserStatusUseCase, inject: [T.userRepository, T.roleRepository, T.userStoreRoleRepository] },
      { useCase: AssignUserStoreRoleUseCase, inject: [T.userRepository, T.roleRepository, T.userStoreRoleRepository] },
      { useCase: RemoveUserStoreRoleUseCase, inject: [T.roleRepository, T.userStoreRoleRepository] },
      { useCase: CreateRoleUseCase, inject: [T.roleRepository] },
      { useCase: UpdateRoleUseCase, inject: [T.roleRepository] },
      { useCase: DeleteRoleUseCase, inject: [T.roleRepository, T.userStoreRoleRepository] },
      { useCase: ListRolesUseCase, inject: [T.roleRepository] },
      { useCase: GetRoleUseCase, inject: [T.roleRepository] },
    ]),
    JwtAuthGuard,
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    PermissionsGuard,
    { provide: APP_GUARD, useExisting: PermissionsGuard },
  ],
  exports: [T.userStoreRoleRepository, T.roleRepository],
})
export class AuthModule {}
