import { PrismaService } from '@mitama/db';
import { recordActivity, type RecordActivityInput } from '../../activity-log';
import { ValueTaxonomy } from '../domain/value-taxonomy.entity';
import type { ValueTaxonomyRepository } from '../domain/value-taxonomy.repository';

interface TaxonomyRow {
  id: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Modelos de Prisma con la forma { id, value, metadata, createdAt, updatedAt, deletedAt }. */
export type TaxonomyModelName = 'productTag' | 'productType';

/**
 * Adapter genérico para taxonomías de valor único. Una instancia por modelo
 * (ver catalog.module.ts), evitando duplicar la misma lógica CRUD.
 */
export class PrismaValueTaxonomyRepository implements ValueTaxonomyRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly model: TaxonomyModelName,
  ) {}

  private delegate(client: object): {
    findUnique: (args: { where: Record<string, unknown> }) => Promise<TaxonomyRow | null>;
    findMany: (args: { where: Record<string, unknown>; orderBy: Record<string, unknown> }) => Promise<TaxonomyRow[]>;
    create: (args: { data: Record<string, unknown> }) => Promise<TaxonomyRow>;
    update: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<TaxonomyRow>;
  } {
    return (client as Record<TaxonomyModelName, ReturnType<typeof this.delegate>>)[this.model];
  }

  async findById(id: string): Promise<ValueTaxonomy | null> {
    const row = await this.delegate(this.prisma).findUnique({ where: { id, deletedAt: null } });
    return row ? this.toDomain(row) : null;
  }

  async findByValue(value: string): Promise<ValueTaxonomy | null> {
    const row = await this.delegate(this.prisma).findUnique({ where: { value, deletedAt: null } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<ValueTaxonomy[]> {
    const rows = await this.delegate(this.prisma).findMany({ where: { deletedAt: null }, orderBy: { value: 'asc' } });
    return rows.map((row) => this.toDomain(row));
  }

  async create(entity: ValueTaxonomy, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.delegate(tx).create({
        data: { id: entity.id, value: entity.value, createdAt: entity.createdAt, updatedAt: entity.updatedAt },
      });
      await recordActivity(tx, activity);
    });
  }

  async update(entity: ValueTaxonomy, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.delegate(tx).update({
        where: { id: entity.id },
        data: { value: entity.value, updatedAt: entity.updatedAt },
      });
      await recordActivity(tx, activity);
    });
  }

  async delete(id: string, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.delegate(tx).update({ where: { id }, data: { deletedAt: new Date() } });
      await recordActivity(tx, activity);
    });
  }

  private toDomain(row: TaxonomyRow): ValueTaxonomy {
    return ValueTaxonomy.rehydrate({ value: row.value, createdAt: row.createdAt, updatedAt: row.updatedAt }, row.id);
  }
}
