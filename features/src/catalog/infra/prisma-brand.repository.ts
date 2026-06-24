import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/data';
import { recordActivity, type RecordActivityInput } from '../../activity-log';
import { Brand } from '../domain/brand.entity';
import type { BrandRepository, SlugRedirect } from '../domain/brand.repository';

interface BrandRow {
  id: string;
  name: string;
  handle: string;
  logoUrl: string | null;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PrismaBrandRepository implements BrandRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Brand | null> {
    const row = await this.prisma.brand.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByHandle(handle: string): Promise<Brand | null> {
    const row = await this.prisma.brand.findUnique({ where: { handle } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<Brand[]> {
    const rows = await this.prisma.brand.findMany({ orderBy: { name: 'asc' } });
    return rows.map((row) => this.toDomain(row));
  }

  async create(brand: Brand, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.brand.create({ data: this.toRow(brand) });
      await recordActivity(tx, activity);
    });
  }

  async update(brand: Brand, activity: RecordActivityInput, redirect: SlugRedirect | null): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.brand.update({ where: { id: brand.id }, data: this.toRow(brand) });
      if (redirect) {
        await tx.urlRedirect.create({
          data: { fromPath: redirect.fromPath, toPath: redirect.toPath, entityType: redirect.entityType },
        });
      }
      await recordActivity(tx, activity);
    });
  }

  private toRow(brand: Brand) {
    return {
      id: brand.id,
      name: brand.name,
      handle: brand.handle,
      logoUrl: brand.logoUrl,
      description: brand.description,
      metaTitle: brand.metaTitle,
      metaDescription: brand.metaDescription,
      isActive: brand.isActive,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
    };
  }

  private toDomain(row: BrandRow): Brand {
    return Brand.rehydrate(
      {
        name: row.name,
        handle: row.handle,
        logoUrl: row.logoUrl,
        description: row.description,
        metaTitle: row.metaTitle,
        metaDescription: row.metaDescription,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.id,
    );
  }
}
