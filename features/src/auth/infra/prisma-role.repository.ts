import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/data';
import { recordActivity, type RecordActivityInput } from '../../activity-log';
import type { Permission } from '@mitama/contracts';
import { Role } from '../domain/role.entity';
import type { RoleRepository } from '../domain/role.repository';

interface RoleRow {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PrismaRoleRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Role | null> {
    const row = await this.prisma.role.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByName(name: string): Promise<Role | null> {
    const row = await this.prisma.role.findUnique({ where: { name } });
    return row ? this.toDomain(row) : null;
  }

  async findSystemRole(): Promise<Role | null> {
    const row = await this.prisma.role.findFirst({ where: { isSystem: true } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<Role[]> {
    const rows = await this.prisma.role.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map((row) => this.toDomain(row));
  }

  async create(role: Role, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.role.create({ data: this.toRow(role) });
      await recordActivity(tx, activity);
    });
  }

  async update(role: Role, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.role.update({ where: { id: role.id }, data: this.toRow(role) });
      await recordActivity(tx, activity);
    });
  }

  async delete(id: string, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.role.delete({ where: { id } });
      await recordActivity(tx, activity);
    });
  }

  private toRow(role: Role) {
    return {
      id: role.id,
      name: role.name,
      isSystem: role.isSystem,
      permissions: role.permissions,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  private toDomain(row: RoleRow): Role {
    return Role.rehydrate(
      {
        name: row.name,
        isSystem: row.isSystem,
        permissions: row.permissions as Permission[],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.id,
    );
  }
}
