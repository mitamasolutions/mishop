import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import { recordActivity, type RecordActivityInput } from '../../activity-log';
import { Email } from '../domain/email.vo';
import { User, type UserStatus } from '../domain/user.entity';
import type { UserRepository } from '../domain/user.repository';

interface UserRow {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email: email.value } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<User[]> {
    const rows = await this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map((row) => this.toDomain(row));
  }

  async create(user: User, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.create({ data: this.toRow(user) });
      await recordActivity(tx, activity);
    });
  }

  async update(user: User, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: this.toRow(user) });
      await recordActivity(tx, activity);
    });
  }

  private toRow(user: User) {
    return {
      id: user.id,
      email: user.email.value,
      name: user.name,
      status: user.status,
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private toDomain(row: UserRow): User {
    const emailResult = Email.create(row.email);
    if (emailResult.isErr()) {
      throw emailResult.error;
    }
    return User.rehydrate(
      {
        email: emailResult.value,
        name: row.name,
        status: row.status,
        failedLoginAttempts: row.failedLoginAttempts,
        lockedUntil: row.lockedUntil,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.id,
    );
  }
}
