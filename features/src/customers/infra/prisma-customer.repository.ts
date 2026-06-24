import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@mitama/data';
import { Customer, type CustomerAddressProps, normalizeEmail } from '../domain/customer.entity';
import type { CustomerRepository, ListCustomersFilter, PaginatedCustomers } from '../domain/customer.repository';

const CUSTOMER_INCLUDE = { addresses: true } satisfies Prisma.CustomerInclude;

type CustomerRow = Prisma.CustomerGetPayload<{ include: typeof CUSTOMER_INCLUDE }>;

@Injectable()
export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Customer | null> {
    const row = await this.prisma.customer.findUnique({ where: { id }, include: CUSTOMER_INCLUDE });
    return row ? this.toDomain(row) : null;
  }

  async findByStoreAndEmail(storeId: string, email: string): Promise<Customer | null> {
    const row = await this.prisma.customer.findUnique({
      where: { storeId_email: { storeId, email: normalizeEmail(email) } },
      include: CUSTOMER_INCLUDE,
    });
    return row ? this.toDomain(row) : null;
  }

  async findAll(filter: ListCustomersFilter): Promise<PaginatedCustomers> {
    const where: Prisma.CustomerWhereInput = {
      storeId: filter.storeId,
      ...(filter.q
        ? {
            OR: [
              { email: { contains: filter.q, mode: 'insensitive' } },
              { firstName: { contains: filter.q, mode: 'insensitive' } },
              { lastName: { contains: filter.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const pageSize = filter.pageSize && filter.pageSize > 0 ? filter.pageSize : 20;
    const [total, rows] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        include: CUSTOMER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items: rows.map((row) => this.toDomain(row)), total, page, pageSize };
  }

  async save(customer: Customer): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.customer.upsert({
        where: { id: customer.id },
        create: this.toCustomerRow(customer),
        update: this.toCustomerRow(customer),
      });
      await tx.customerAddress.deleteMany({ where: { customerId: customer.id } });
      if (customer.addresses.length > 0) {
        await tx.customerAddress.createMany({ data: customer.addresses.map((address) => this.toAddressRow(customer.id, address)) });
      }
    });
  }

  private toCustomerRow(customer: Customer): Prisma.CustomerUncheckedCreateInput {
    return {
      id: customer.id,
      storeId: customer.storeId,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      passwordHash: customer.passwordHash,
      isGuest: customer.isGuest,
      emailVerifiedAt: customer.emailVerifiedAt,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  private toAddressRow(customerId: string, address: CustomerAddressProps): Prisma.CustomerAddressUncheckedCreateInput {
    return { customerId, ...address };
  }

  private toDomain(row: CustomerRow): Customer {
    return Customer.rehydrate(
      {
        storeId: row.storeId,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone,
        passwordHash: row.passwordHash,
        isGuest: row.isGuest,
        emailVerifiedAt: row.emailVerifiedAt,
        addresses: row.addresses.map((address) => ({
          id: address.id,
          firstName: address.firstName,
          lastName: address.lastName,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          province: address.province,
          postalCode: address.postalCode,
          countryCode: address.countryCode,
          isDefaultShipping: address.isDefaultShipping,
          isDefaultBilling: address.isDefaultBilling,
          createdAt: address.createdAt,
          updatedAt: address.updatedAt,
        })),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.id,
    );
  }
}
