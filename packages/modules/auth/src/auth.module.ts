/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 * Los puertos de domain se resuelven a adapters de infra vía tokens.
 */
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AUTH_TOKENS } from './auth.tokens';
import { ACCESS_TOKEN_TTL } from './application/shared/constants';

import type { UserRepository } from './domain/user.repository';
import type { PasswordCredentialRepository } from './domain/password-credential.repository';
import type { RefreshTokenRepository } from './domain/refresh-token.repository';
import type { RoleRepository } from './domain/role.repository';
import type { UserStoreRoleRepository } from './domain/user-store-role.repository';
import type { InvitationTokenRepository } from './domain/invitation-token.repository';
import type { PasswordResetTokenRepository } from './domain/password-reset-token.repository';
import type { PasswordHasher } from './domain/password-hasher';
import type { AccessTokenIssuer } from './domain/access-token-issuer';

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
      provide: LoginUseCase,
      useFactory: (
        users: UserRepository,
        passwordCredentials: PasswordCredentialRepository,
        refreshTokens: RefreshTokenRepository,
        userStoreRoles: UserStoreRoleRepository,
        passwordHasher: PasswordHasher,
        accessTokenIssuer: AccessTokenIssuer,
      ) => new LoginUseCase(users, passwordCredentials, refreshTokens, userStoreRoles, passwordHasher, accessTokenIssuer),
      inject: [
        T.userRepository,
        T.passwordCredentialRepository,
        T.refreshTokenRepository,
        T.userStoreRoleRepository,
        T.passwordHasher,
        T.accessTokenIssuer,
      ],
    },
    {
      provide: RefreshSessionUseCase,
      useFactory: (
        users: UserRepository,
        refreshTokens: RefreshTokenRepository,
        userStoreRoles: UserStoreRoleRepository,
        accessTokenIssuer: AccessTokenIssuer,
      ) => new RefreshSessionUseCase(users, refreshTokens, userStoreRoles, accessTokenIssuer),
      inject: [T.userRepository, T.refreshTokenRepository, T.userStoreRoleRepository, T.accessTokenIssuer],
    },
    {
      provide: LogoutUseCase,
      useFactory: (refreshTokens: RefreshTokenRepository) => new LogoutUseCase(refreshTokens),
      inject: [T.refreshTokenRepository],
    },
    {
      provide: RequestPasswordResetUseCase,
      useFactory: (users: UserRepository, passwordResetTokens: PasswordResetTokenRepository) =>
        new RequestPasswordResetUseCase(users, passwordResetTokens),
      inject: [T.userRepository, T.passwordResetTokenRepository],
    },
    {
      provide: ResetPasswordUseCase,
      useFactory: (
        users: UserRepository,
        passwordCredentials: PasswordCredentialRepository,
        passwordResetTokens: PasswordResetTokenRepository,
        passwordHasher: PasswordHasher,
      ) => new ResetPasswordUseCase(users, passwordCredentials, passwordResetTokens, passwordHasher),
      inject: [T.userRepository, T.passwordCredentialRepository, T.passwordResetTokenRepository, T.passwordHasher],
    },
    {
      provide: AcceptInvitationUseCase,
      useFactory: (
        users: UserRepository,
        invitationTokens: InvitationTokenRepository,
        passwordHasher: PasswordHasher,
      ) => new AcceptInvitationUseCase(users, invitationTokens, passwordHasher),
      inject: [T.userRepository, T.invitationTokenRepository, T.passwordHasher],
    },
    {
      provide: ChangePasswordUseCase,
      useFactory: (
        users: UserRepository,
        passwordCredentials: PasswordCredentialRepository,
        passwordHasher: PasswordHasher,
      ) => new ChangePasswordUseCase(users, passwordCredentials, passwordHasher),
      inject: [T.userRepository, T.passwordCredentialRepository, T.passwordHasher],
    },
    {
      provide: InviteUserUseCase,
      useFactory: (users: UserRepository, roles: RoleRepository, invitationTokens: InvitationTokenRepository) =>
        new InviteUserUseCase(users, roles, invitationTokens),
      inject: [T.userRepository, T.roleRepository, T.invitationTokenRepository],
    },
    {
      provide: ListUsersUseCase,
      useFactory: (users: UserRepository, userStoreRoles: UserStoreRoleRepository) =>
        new ListUsersUseCase(users, userStoreRoles),
      inject: [T.userRepository, T.userStoreRoleRepository],
    },
    {
      provide: GetUserUseCase,
      useFactory: (users: UserRepository, userStoreRoles: UserStoreRoleRepository) =>
        new GetUserUseCase(users, userStoreRoles),
      inject: [T.userRepository, T.userStoreRoleRepository],
    },
    {
      provide: UpdateUserStatusUseCase,
      useFactory: (users: UserRepository, roles: RoleRepository, userStoreRoles: UserStoreRoleRepository) =>
        new UpdateUserStatusUseCase(users, roles, userStoreRoles),
      inject: [T.userRepository, T.roleRepository, T.userStoreRoleRepository],
    },
    {
      provide: AssignUserStoreRoleUseCase,
      useFactory: (users: UserRepository, roles: RoleRepository, userStoreRoles: UserStoreRoleRepository) =>
        new AssignUserStoreRoleUseCase(users, roles, userStoreRoles),
      inject: [T.userRepository, T.roleRepository, T.userStoreRoleRepository],
    },
    {
      provide: RemoveUserStoreRoleUseCase,
      useFactory: (roles: RoleRepository, userStoreRoles: UserStoreRoleRepository) =>
        new RemoveUserStoreRoleUseCase(roles, userStoreRoles),
      inject: [T.roleRepository, T.userStoreRoleRepository],
    },
    {
      provide: CreateRoleUseCase,
      useFactory: (roles: RoleRepository) => new CreateRoleUseCase(roles),
      inject: [T.roleRepository],
    },
    {
      provide: UpdateRoleUseCase,
      useFactory: (roles: RoleRepository) => new UpdateRoleUseCase(roles),
      inject: [T.roleRepository],
    },
    {
      provide: DeleteRoleUseCase,
      useFactory: (roles: RoleRepository, userStoreRoles: UserStoreRoleRepository) =>
        new DeleteRoleUseCase(roles, userStoreRoles),
      inject: [T.roleRepository, T.userStoreRoleRepository],
    },
    {
      provide: ListRolesUseCase,
      useFactory: (roles: RoleRepository) => new ListRolesUseCase(roles),
      inject: [T.roleRepository],
    },
    {
      provide: GetRoleUseCase,
      useFactory: (roles: RoleRepository) => new GetRoleUseCase(roles),
      inject: [T.roleRepository],
    },

    JwtAuthGuard,
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    PermissionsGuard,
    { provide: APP_GUARD, useExisting: PermissionsGuard },
  ],
  exports: [T.userStoreRoleRepository, T.roleRepository],
})
export class AuthModule {}
