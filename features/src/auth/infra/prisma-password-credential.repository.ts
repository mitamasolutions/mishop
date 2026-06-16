import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import { recordActivity, type RecordActivityInput } from '../../activity-log';
import { PasswordCredential } from '../domain/password-credential.entity';
import type { PasswordCredentialRepository } from '../domain/password-credential.repository';

interface PasswordCredentialRow {
  id: string;
  userId: string;
  hash: string;
  createdAt: Date;
}

@Injectable()
export class PrismaPasswordCredentialRepository implements PasswordCredentialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRecentByUserId(userId: string, limit: number): Promise<PasswordCredential[]> {
    const rows = await this.prisma.passwordCredential.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => this.toDomain(row));
  }

  async create(credential: PasswordCredential, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.passwordCredential.create({
        data: {
          id: credential.id,
          userId: credential.userId,
          hash: credential.hash,
          createdAt: credential.createdAt,
        },
      });
      await recordActivity(tx, activity);
    });
  }

  private toDomain(row: PasswordCredentialRow): PasswordCredential {
    return PasswordCredential.rehydrate({ userId: row.userId, hash: row.hash, createdAt: row.createdAt }, row.id);
  }
}
