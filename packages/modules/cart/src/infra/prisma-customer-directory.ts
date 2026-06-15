import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import type { CustomerDirectory, IdentifyCustomerInput } from '../domain/customer-directory';

@Injectable()
export class PrismaCustomerDirectory implements CustomerDirectory {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateGuest(input: IdentifyCustomerInput): Promise<{ id: string }> {
    const existing = await this.prisma.customer.findUnique({
      where: { storeId_email: { storeId: input.storeId, email: input.email } },
      select: { id: true },
    });
    if (existing) return existing;

    const created = await this.prisma.customer.create({
      data: {
        storeId: input.storeId,
        email: input.email,
        firstName: input.firstName ?? '',
        lastName: input.lastName ?? '',
        phone: input.phone ?? null,
        isGuest: true,
      },
      select: { id: true },
    });
    return created;
  }
}
