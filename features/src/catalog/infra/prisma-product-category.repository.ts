import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/data';
import { recordActivity, type RecordActivityInput } from '../../activity-log';
import { ProductCategory } from '../domain/product-category.entity';
import type { ProductCategoryRepository } from '../domain/product-category.repository';
import type { SlugRedirect } from '../domain/brand.repository';

interface ProductCategoryRow {
  id: string;
  name: string;
  description: string | null;
  handle: string;
  mpath: string | null;
  isActive: boolean;
  isInternal: boolean;
  rank: number;
  parentCategoryId: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PrismaProductCategoryRepository implements ProductCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ProductCategory | null> {
    const row = await this.prisma.productCategory.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByHandle(handle: string): Promise<ProductCategory | null> {
    const row = await this.prisma.productCategory.findUnique({ where: { handle } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<ProductCategory[]> {
    const rows = await this.prisma.productCategory.findMany({ orderBy: [{ mpath: 'asc' }, { rank: 'asc' }] });
    return rows.map((row) => this.toDomain(row));
  }

  async findChildren(parentCategoryId: string | null): Promise<ProductCategory[]> {
    const rows = await this.prisma.productCategory.findMany({
      where: { parentCategoryId },
      orderBy: { rank: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findDescendants(category: ProductCategory): Promise<ProductCategory[]> {
    const rows = await this.prisma.productCategory.findMany({
      where: { mpath: { startsWith: category.fullPath } },
      orderBy: [{ mpath: 'asc' }, { rank: 'asc' }],
    });
    return rows.map((row) => this.toDomain(row));
  }

  async create(category: ProductCategory, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.productCategory.create({ data: this.toRow(category) });
      await recordActivity(tx, activity);
    });
  }

  async update(category: ProductCategory, activity: RecordActivityInput, redirect: SlugRedirect | null): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.productCategory.update({ where: { id: category.id }, data: this.toRow(category) });
      if (redirect) {
        await tx.urlRedirect.create({
          data: { fromPath: redirect.fromPath, toPath: redirect.toPath, entityType: redirect.entityType },
        });
      }
      await recordActivity(tx, activity);
    });
  }

  async move(category: ProductCategory, descendants: ProductCategory[], activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.productCategory.update({ where: { id: category.id }, data: this.toRow(category) });
      for (const descendant of descendants) {
        await tx.productCategory.update({ where: { id: descendant.id }, data: { mpath: descendant.mpath } });
      }
      await recordActivity(tx, activity);
    });
  }

  async remove(category: ProductCategory, reparented: ProductCategory[], activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const node of reparented) {
        await tx.productCategory.update({
          where: { id: node.id },
          data: { parentCategoryId: node.parentCategoryId, mpath: node.mpath, rank: node.rank },
        });
      }
      await tx.productCategory.delete({ where: { id: category.id } });
      await recordActivity(tx, activity);
    });
  }

  private toRow(category: ProductCategory) {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      handle: category.handle,
      mpath: category.mpath,
      isActive: category.isActive,
      isInternal: category.isInternal,
      rank: category.rank,
      parentCategoryId: category.parentCategoryId,
      metaTitle: category.metaTitle,
      metaDescription: category.metaDescription,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  private toDomain(row: ProductCategoryRow): ProductCategory {
    return ProductCategory.rehydrate(
      {
        name: row.name,
        description: row.description,
        handle: row.handle,
        mpath: row.mpath ?? '',
        isActive: row.isActive,
        isInternal: row.isInternal,
        rank: row.rank,
        parentCategoryId: row.parentCategoryId,
        metaTitle: row.metaTitle,
        metaDescription: row.metaDescription,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.id,
    );
  }
}
