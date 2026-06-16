/** Tokens de inyección internos del módulo: puertos → adapters. */
export const AUTH_TOKENS = {
  userRepository: 'auth.user-repository',
  passwordCredentialRepository: 'auth.password-credential-repository',
  refreshTokenRepository: 'auth.refresh-token-repository',
  roleRepository: 'auth.role-repository',
  userStoreRoleRepository: 'auth.user-store-role-repository',
  invitationTokenRepository: 'auth.invitation-token-repository',
  passwordResetTokenRepository: 'auth.password-reset-token-repository',
  passwordHasher: 'auth.password-hasher',
  accessTokenIssuer: 'auth.access-token-issuer',
} as const;
