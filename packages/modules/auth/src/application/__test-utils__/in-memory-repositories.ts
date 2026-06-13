/**
 * Adapters in-memory compartidos por los specs de application/. Patrón de
 * referencia: ninguno toca Prisma ni NestJS.
 */
import type { RecordActivityInput } from '@mitama/activity-log';
import type { AccessTokenIssuer, AccessTokenPayload } from '../../domain/access-token-issuer';
import { Email } from '../../domain/email.vo';
import type { InvitationToken } from '../../domain/invitation-token.entity';
import type { InvitationTokenRepository } from '../../domain/invitation-token.repository';
import type { PasswordCredential } from '../../domain/password-credential.entity';
import type { PasswordCredentialRepository } from '../../domain/password-credential.repository';
import type { PasswordHasher } from '../../domain/password-hasher';
import type { PasswordResetToken } from '../../domain/password-reset-token.entity';
import type { PasswordResetTokenRepository } from '../../domain/password-reset-token.repository';
import type { RefreshToken } from '../../domain/refresh-token.entity';
import type { RefreshTokenRepository } from '../../domain/refresh-token.repository';
import type { Role } from '../../domain/role.entity';
import type { RoleRepository } from '../../domain/role.repository';
import type { User } from '../../domain/user.entity';
import type { UserRepository } from '../../domain/user.repository';
import type { UserStoreRole } from '../../domain/user-store-role.entity';
import type {
  UserStoreRoleRepository,
  UserStoreRoleWithRole,
} from '../../domain/user-store-role.repository';

export class InMemoryUserRepository implements UserRepository {
  readonly users = new Map<string, User>();
  readonly recordedActivity: RecordActivityInput[] = [];

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email.equals(email)) {
        return user;
      }
    }
    return null;
  }

  async findAll(): Promise<User[]> {
    return [...this.users.values()];
  }

  async create(user: User, activity: RecordActivityInput): Promise<void> {
    this.users.set(user.id, user);
    this.recordedActivity.push(activity);
  }

  async update(user: User, activity: RecordActivityInput): Promise<void> {
    this.users.set(user.id, user);
    this.recordedActivity.push(activity);
  }
}

export class InMemoryPasswordCredentialRepository implements PasswordCredentialRepository {
  readonly credentials: PasswordCredential[] = [];
  readonly recordedActivity: RecordActivityInput[] = [];

  async findRecentByUserId(userId: string, limit: number): Promise<PasswordCredential[]> {
    return this.credentials
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async create(credential: PasswordCredential, activity: RecordActivityInput): Promise<void> {
    this.credentials.push(credential);
    this.recordedActivity.push(activity);
  }
}

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  readonly tokens = new Map<string, RefreshToken>();
  readonly recordedActivity: RecordActivityInput[] = [];

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    for (const token of this.tokens.values()) {
      if (token.tokenHash === tokenHash) {
        return token;
      }
    }
    return null;
  }

  async create(token: RefreshToken, _user: User, activity: RecordActivityInput): Promise<void> {
    this.tokens.set(token.id, token);
    this.recordedActivity.push(activity);
  }

  async rotate(previous: RefreshToken, next: RefreshToken, activity: RecordActivityInput): Promise<void> {
    this.tokens.set(previous.id, previous);
    this.tokens.set(next.id, next);
    this.recordedActivity.push(activity);
  }

  async revokeFamily(familyId: string, activity: RecordActivityInput): Promise<void> {
    const now = new Date();
    for (const token of this.tokens.values()) {
      if (token.familyId === familyId && !token.isRevoked()) {
        token.revoke(now);
      }
    }
    this.recordedActivity.push(activity);
  }
}

export class InMemoryRoleRepository implements RoleRepository {
  readonly roles = new Map<string, Role>();
  readonly recordedActivity: RecordActivityInput[] = [];

  async findById(id: string): Promise<Role | null> {
    return this.roles.get(id) ?? null;
  }

  async findByName(name: string): Promise<Role | null> {
    for (const role of this.roles.values()) {
      if (role.name === name) {
        return role;
      }
    }
    return null;
  }

  async findSystemRole(): Promise<Role | null> {
    for (const role of this.roles.values()) {
      if (role.isSystem) {
        return role;
      }
    }
    return null;
  }

  async findAll(): Promise<Role[]> {
    return [...this.roles.values()];
  }

  async create(role: Role, activity: RecordActivityInput): Promise<void> {
    this.roles.set(role.id, role);
    this.recordedActivity.push(activity);
  }

  async update(role: Role, activity: RecordActivityInput): Promise<void> {
    this.roles.set(role.id, role);
    this.recordedActivity.push(activity);
  }

  async delete(id: string, activity: RecordActivityInput): Promise<void> {
    this.roles.delete(id);
    this.recordedActivity.push(activity);
  }
}

export class InMemoryUserStoreRoleRepository implements UserStoreRoleRepository {
  readonly assignments = new Map<string, UserStoreRole>();
  readonly recordedActivity: RecordActivityInput[] = [];

  constructor(private readonly roles: InMemoryRoleRepository) {}

  async findById(id: string): Promise<UserStoreRole | null> {
    return this.assignments.get(id) ?? null;
  }

  async findByUserId(userId: string): Promise<UserStoreRoleWithRole[]> {
    const result: UserStoreRoleWithRole[] = [];
    for (const assignment of this.assignments.values()) {
      if (assignment.userId !== userId) {
        continue;
      }
      const role = await this.roles.findById(assignment.roleId);
      if (!role) {
        continue;
      }
      result.push({
        assignment,
        roleName: role.name,
        roleIsSystem: role.isSystem,
        permissions: role.permissions,
      });
    }
    return result;
  }

  async findByRoleId(roleId: string): Promise<UserStoreRole[]> {
    return [...this.assignments.values()].filter((a) => a.roleId === roleId);
  }

  async countGlobalAssignments(roleId: string): Promise<number> {
    return [...this.assignments.values()].filter((a) => a.roleId === roleId && a.storeId === null).length;
  }

  async create(assignment: UserStoreRole, activity: RecordActivityInput): Promise<void> {
    this.assignments.set(assignment.id, assignment);
    this.recordedActivity.push(activity);
  }

  async delete(id: string, activity: RecordActivityInput): Promise<void> {
    this.assignments.delete(id);
    this.recordedActivity.push(activity);
  }
}

export class InMemoryInvitationTokenRepository implements InvitationTokenRepository {
  readonly tokens = new Map<string, InvitationToken>();
  readonly recordedActivity: RecordActivityInput[] = [];

  constructor(
    private readonly users: InMemoryUserRepository,
    private readonly userStoreRoles: InMemoryUserStoreRoleRepository,
    private readonly passwordCredentials: InMemoryPasswordCredentialRepository,
  ) {}

  async findByTokenHash(tokenHash: string): Promise<InvitationToken | null> {
    for (const token of this.tokens.values()) {
      if (token.tokenHash === tokenHash) {
        return token;
      }
    }
    return null;
  }

  async create(
    token: InvitationToken,
    options: { user: User; userStoreRole: UserStoreRole },
    activity: RecordActivityInput,
  ): Promise<void> {
    this.users.users.set(options.user.id, options.user);
    this.userStoreRoles.assignments.set(options.userStoreRole.id, options.userStoreRole);
    this.tokens.set(token.id, token);
    this.recordedActivity.push(activity);
  }

  async accept(
    token: InvitationToken,
    options: { user: User; credential: PasswordCredential },
    activity: RecordActivityInput,
  ): Promise<void> {
    this.tokens.set(token.id, token);
    this.users.users.set(options.user.id, options.user);
    this.passwordCredentials.credentials.push(options.credential);
    this.recordedActivity.push(activity);
  }
}

export class InMemoryPasswordResetTokenRepository implements PasswordResetTokenRepository {
  readonly tokens = new Map<string, PasswordResetToken>();
  readonly recordedActivity: RecordActivityInput[] = [];

  constructor(
    private readonly users: InMemoryUserRepository,
    private readonly passwordCredentials: InMemoryPasswordCredentialRepository,
  ) {}

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    for (const token of this.tokens.values()) {
      if (token.tokenHash === tokenHash) {
        return token;
      }
    }
    return null;
  }

  async create(token: PasswordResetToken, activity: RecordActivityInput): Promise<void> {
    this.tokens.set(token.id, token);
    this.recordedActivity.push(activity);
  }

  async consume(
    token: PasswordResetToken,
    options: { user: User; credential: PasswordCredential },
    activity: RecordActivityInput,
  ): Promise<void> {
    this.tokens.set(token.id, token);
    this.users.users.set(options.user.id, options.user);
    this.passwordCredentials.credentials.push(options.credential);
    this.recordedActivity.push(activity);
  }
}

export class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }

  async compare(plain: string, hashed: string): Promise<boolean> {
    return hashed === `hashed:${plain}`;
  }
}

export class FakeAccessTokenIssuer implements AccessTokenIssuer {
  sign(payload: AccessTokenPayload): string {
    return `token:${JSON.stringify(payload)}`;
  }

  verify(token: string): AccessTokenPayload {
    return JSON.parse(token.replace(/^token:/, '')) as AccessTokenPayload;
  }
}
