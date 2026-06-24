import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/data';
import { recordActivity, type RecordActivityInput } from '../../activity-log';
import type { Permission } from '@mitama/contracts';
import { UserStoreRole } from '../domain/user-store-role.entity';
import type { UserStoreRoleRepository, UserStoreRoleWithRole } from '../domain/user-store-role.repository';

interface UserStoreRoleRow {
  id: string;
  userId: string;
  storeId: string | null;
  roleId: string;
  createdAt: Date;
}

interface UserStoreRoleRowWithRole extends UserStoreRoleRow {
  role: { name: string; isSystem: boolean; permissions: string[] };
}

/**
 * Las asignaciones usuario↔rol son consultadas por identidad/ACL de forma
 * transversal a tiendas (login, gestión de usuarios), por lo que este repo
 * usa el cliente Prisma sin scoping (no `SCOPED_PRISMA`).
 */
@Injectable()
export class PrismaUserStoreRoleRepository implements UserStoreRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserStoreRole | null> {
    const row = await this.prisma.userStoreRole.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<UserStoreRoleWithRole[]> {
    const rows = await this.prisma.userStoreRole.findMany({
      where: { userId },
      include: { role: { select: { name: true, isSystem: true, permissions: true } } },
    });
    return rows.map((row) => this.toDomainWithRole(row));
  }

  async findByRoleId(roleId: string): Promise<UserStoreRole[]> {
    const rows = await this.prisma.userStoreRole.findMany({ where: { roleId } });
    return rows.map((row) => this.toDomain(row));
  }

  async countGlobalAssignments(roleId: string): Promise<number> {
    return this.prisma.userStoreRole.count({ where: { roleId, storeId: null } });
  }

  async create(assignment: UserStoreRole, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userStoreRole.create({ data: this.toRow(assignment) });
      await recordActivity(tx, activity);
    });
  }

  async delete(id: string, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userStoreRole.delete({ where: { id } });
      await recordActivity(tx, activity);
    });
  }

  private toRow(assignment: UserStoreRole) {
    return {
      id: assignment.id,
      userId: assignment.userId,
      storeId: assignment.storeId,
      roleId: assignment.roleId,
      createdAt: assignment.createdAt,
    };
  }

  private toDomain(row: UserStoreRoleRow): UserStoreRole {
    return UserStoreRole.rehydrate(
      { userId: row.userId, storeId: row.storeId, roleId: row.roleId, createdAt: row.createdAt },
      row.id,
    );
  }

  private toDomainWithRole(row: UserStoreRoleRowWithRole): UserStoreRoleWithRole {
    return {
      assignment: this.toDomain(row),
      roleName: row.role.name,
      roleIsSystem: row.role.isSystem,
      permissions: row.role.permissions as Permission[],
    };
  }
}
