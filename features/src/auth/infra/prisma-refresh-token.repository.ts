import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import { recordActivity, type RecordActivityInput } from '@mitama/activity-log';
import { RefreshToken } from '../domain/refresh-token.entity';
import type { RefreshTokenRepository } from '../domain/refresh-token.repository';
import { User } from '../domain/user.entity';

interface RefreshTokenRow {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    return row ? this.toDomain(row) : null;
  }

  async create(token: RefreshToken, user: User, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.create({ data: this.toRow(token) });
      await tx.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: user.failedLoginAttempts,
          lockedUntil: user.lockedUntil,
          status: user.status,
          updatedAt: user.updatedAt,
        },
      });
      await recordActivity(tx, activity);
    });
  }

  async rotate(previous: RefreshToken, next: RefreshToken, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({ where: { id: previous.id }, data: { revokedAt: previous.revokedAt } });
      await tx.refreshToken.create({ data: this.toRow(next) });
      await recordActivity(tx, activity);
    });
  }

  async revokeFamily(familyId: string, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await recordActivity(tx, activity);
    });
  }

  private toRow(token: RefreshToken) {
    return {
      id: token.id,
      userId: token.userId,
      familyId: token.familyId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      revokedAt: token.revokedAt,
      createdAt: token.createdAt,
    };
  }

  private toDomain(row: RefreshTokenRow): RefreshToken {
    return RefreshToken.rehydrate(
      {
        userId: row.userId,
        familyId: row.familyId,
        tokenHash: row.tokenHash,
        expiresAt: row.expiresAt,
        revokedAt: row.revokedAt,
        createdAt: row.createdAt,
      },
      row.id,
    );
  }
}
