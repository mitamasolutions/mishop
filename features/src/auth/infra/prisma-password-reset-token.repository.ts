import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/data';
import { recordActivity, type RecordActivityInput } from '../../activity-log';
import { PasswordCredential } from '../domain/password-credential.entity';
import { PasswordResetToken } from '../domain/password-reset-token.entity';
import type { PasswordResetTokenRepository } from '../domain/password-reset-token.repository';
import { User } from '../domain/user.entity';

interface PasswordResetTokenRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class PrismaPasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const row = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    return row ? this.toDomain(row) : null;
  }

  async create(token: PasswordResetToken, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.create({ data: this.toRow(token) });
      await recordActivity(tx, activity);
    });
  }

  async consume(
    token: PasswordResetToken,
    options: { user: User; credential: PasswordCredential },
    activity: RecordActivityInput,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: token.usedAt } });
      await tx.user.update({
        where: { id: options.user.id },
        data: {
          status: options.user.status,
          failedLoginAttempts: options.user.failedLoginAttempts,
          lockedUntil: options.user.lockedUntil,
          updatedAt: options.user.updatedAt,
        },
      });
      await tx.passwordCredential.create({
        data: {
          id: options.credential.id,
          userId: options.credential.userId,
          hash: options.credential.hash,
          createdAt: options.credential.createdAt,
        },
      });
      await recordActivity(tx, activity);
    });
  }

  private toRow(token: PasswordResetToken) {
    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      createdAt: token.createdAt,
    };
  }

  private toDomain(row: PasswordResetTokenRow): PasswordResetToken {
    return PasswordResetToken.rehydrate(
      { userId: row.userId, tokenHash: row.tokenHash, expiresAt: row.expiresAt, usedAt: row.usedAt, createdAt: row.createdAt },
      row.id,
    );
  }
}
