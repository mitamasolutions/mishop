import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import { recordActivity, type RecordActivityInput } from '@mitama/activity-log';
import { ProductCollection } from '../domain/product-collection.entity';
import type { ProductCollectionRepository } from '../domain/product-collection.repository';
import type { SlugRedirect } from '../domain/brand.repository';

interface ProductCollectionRow {
  id: string;
  title: string;
  handle: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PrismaProductCollectionRepository implements ProductCollectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ProductCollection | null> {
    const row = await this.prisma.productCollection.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByHandle(handle: string): Promise<ProductCollection | null> {
    const row = await this.prisma.productCollection.findUnique({ where: { handle } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<ProductCollection[]> {
    const rows = await this.prisma.productCollection.findMany({ orderBy: { title: 'asc' } });
    return rows.map((row) => this.toDomain(row));
  }

  async create(collection: ProductCollection, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.productCollection.create({ data: this.toRow(collection) });
      await recordActivity(tx, activity);
    });
  }

  async update(
    collection: ProductCollection,
    activity: RecordActivityInput,
    redirect: SlugRedirect | null,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.productCollection.update({ where: { id: collection.id }, data: this.toRow(collection) });
      if (redirect) {
        await tx.urlRedirect.create({
          data: { fromPath: redirect.fromPath, toPath: redirect.toPath, entityType: redirect.entityType },
        });
      }
      await recordActivity(tx, activity);
    });
  }

  private toRow(collection: ProductCollection) {
    return {
      id: collection.id,
      title: collection.title,
      handle: collection.handle,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  }

  private toDomain(row: ProductCollectionRow): ProductCollection {
    return ProductCollection.rehydrate(
      { title: row.title, handle: row.handle, createdAt: row.createdAt, updatedAt: row.updatedAt },
      row.id,
    );
  }
}
