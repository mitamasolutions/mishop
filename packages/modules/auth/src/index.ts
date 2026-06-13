/**
 * API pública del módulo auth. Otros paquetes SOLO pueden importar de aquí
 * (regla 3 de arquitectura). Los eventos compartidos viven en @mitama/contracts.
 */
export { AuthModule } from './auth.module';
export { AUTH_TOKENS } from './auth.tokens';
export type { UserRepository } from './domain/user.repository';
export type { RoleRepository } from './domain/role.repository';
export type { UserStoreRoleRepository } from './domain/user-store-role.repository';
