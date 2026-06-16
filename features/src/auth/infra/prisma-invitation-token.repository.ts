import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import { recordActivity, type RecordActivityInput } from '@mitama/activity-log';
import { InvitationToken } from '../domain/invitation-token.entity';
import type { InvitationTokenRepository } from '../domain/invitation-token.repository';
import { PasswordCredential } from '../domain/password-credential.entity';
import { User } from '../domain/user.entity';
import { UserStoreRole } from '../domain/user-store-role.entity';

interface InvitationTokenRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class PrismaInvitationTokenRepository implements InvitationTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTokenHash(tokenHash: string): Promise<InvitationToken | null> {
    const row = await this.prisma.invitationToken.findUnique({ where: { tokenHash } });
    return row ? this.toDomain(row) : null;
  }

  async create(
    token: InvitationToken,
    options: { user: User; userStoreRole: UserStoreRole },
    activity: RecordActivityInput,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: options.user.id,
          email: options.user.email.value,
          name: options.user.name,
          status: options.user.status,
          failedLoginAttempts: options.user.failedLoginAttempts,
          lockedUntil: options.user.lockedUntil,
          createdAt: options.user.createdAt,
          updatedAt: options.user.updatedAt,
        },
      });
      await tx.userStoreRole.create({
        data: {
          id: options.userStoreRole.id,
          userId: options.userStoreRole.userId,
          storeId: options.userStoreRole.storeId,
          roleId: options.userStoreRole.roleId,
          createdAt: options.userStoreRole.createdAt,
        },
      });
      await tx.invitationToken.create({ data: this.toRow(token) });
      await recordActivity(tx, activity);
    });
  }

  async accept(
    token: InvitationToken,
    options: { user: User; credential: PasswordCredential },
    activity: RecordActivityInput,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.invitationToken.update({ where: { id: token.id }, data: { acceptedAt: token.acceptedAt } });
      await tx.user.update({
        where: { id: options.user.id },
        data: { status: options.user.status, updatedAt: options.user.updatedAt },
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

  private toRow(token: InvitationToken) {
    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      acceptedAt: token.acceptedAt,
      createdAt: token.createdAt,
    };
  }

  private toDomain(row: InvitationTokenRow): InvitationToken {
    return InvitationToken.rehydrate(
      {
        userId: row.userId,
        tokenHash: row.tokenHash,
        expiresAt: row.expiresAt,
        acceptedAt: row.acceptedAt,
        createdAt: row.createdAt,
      },
      row.id,
    );
  }
}
