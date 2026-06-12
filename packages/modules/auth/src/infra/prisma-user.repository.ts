import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import { Email } from '../domain/email.vo';
import { User } from '../domain/user.entity';
import type { UserRepository } from '../domain/user.repository';

interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email: email.value } });
    return row ? this.toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email.value,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt,
      },
      update: {
        email: user.email.value,
        passwordHash: user.passwordHash,
      },
    });
  }

  private toDomain(row: UserRow): User {
    const email = Email.create(row.email);
    if (email.isErr()) {
      throw email.error;
    }
    return User.rehydrate(
      { email: email.value, passwordHash: row.passwordHash, createdAt: row.createdAt },
      row.id,
    );
  }
}
