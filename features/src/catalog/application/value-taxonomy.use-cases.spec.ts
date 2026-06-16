import { beforeEach, describe, expect, it } from 'vitest';
import type { RecordActivityInput } from '@mitama/activity-log';
import { ValidationError } from '@mitama/core';
import { ValueTaxonomy } from '../domain/value-taxonomy.entity';
import { ValueAlreadyInUseError, ValueTaxonomyNotFoundError } from '../domain/errors';
import type { ValueTaxonomyRepository } from '../domain/value-taxonomy.repository';
import {
  CreateValueTaxonomyUseCase,
  DeleteValueTaxonomyUseCase,
  GetValueTaxonomyUseCase,
  ListValueTaxonomyUseCase,
  UpdateValueTaxonomyUseCase,
  type ValueTaxonomyConfig,
} from './value-taxonomy.use-cases';

class InMemoryValueTaxonomyRepository implements ValueTaxonomyRepository {
  readonly items = new Map<string, ValueTaxonomy>();
  readonly activities: RecordActivityInput[] = [];

  async findById(id: string): Promise<ValueTaxonomy | null> {
    return this.items.get(id) ?? null;
  }

  async findByValue(value: string): Promise<ValueTaxonomy | null> {
    for (const item of this.items.values()) {
      if (item.value === value) {
        return item;
      }
    }
    return null;
  }

  async findAll(): Promise<ValueTaxonomy[]> {
    return [...this.items.values()];
  }

  async create(entity: ValueTaxonomy, activity: RecordActivityInput): Promise<void> {
    this.items.set(entity.id, entity);
    this.activities.push(activity);
  }

  async update(entity: ValueTaxonomy, activity: RecordActivityInput): Promise<void> {
    this.items.set(entity.id, entity);
    this.activities.push(activity);
  }

  async delete(id: string, activity: RecordActivityInput): Promise<void> {
    this.items.delete(id);
    this.activities.push(activity);
  }
}

const CONFIG: ValueTaxonomyConfig = {
  entityCode: 'PRODUCT_TAG',
  entityLabel: 'La etiqueta de producto',
  actionPrefix: 'product-tag',
  entityType: 'product_tag',
};

describe('ValueTaxonomy use cases', () => {
  let repo: InMemoryValueTaxonomyRepository;

  beforeEach(() => {
    repo = new InMemoryValueTaxonomyRepository();
  });

  it('crea una taxonomía con valor', async () => {
    const result = await new CreateValueTaxonomyUseCase(repo, CONFIG).execute({
      value: 'Oferta',
      actorUserId: 'user-1',
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.value).toBe('Oferta');
    }
    expect(repo.activities[0]?.action).toBe('product-tag.created');
  });

  it('falla con ValidationError si el valor está vacío', async () => {
    const result = await new CreateValueTaxonomyUseCase(repo, CONFIG).execute({ value: '  ', actorUserId: null });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });

  it('falla con ValueAlreadyInUseError si el valor ya existe', async () => {
    await new CreateValueTaxonomyUseCase(repo, CONFIG).execute({ value: 'Oferta', actorUserId: null });
    const result = await new CreateValueTaxonomyUseCase(repo, CONFIG).execute({ value: 'Oferta', actorUserId: null });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValueAlreadyInUseError);
    }
  });

  it('renombra una taxonomía existente', async () => {
    const created = await new CreateValueTaxonomyUseCase(repo, CONFIG).execute({ value: 'Oferta', actorUserId: null });
    const id = created.isOk() ? created.value.id : '';

    const result = await new UpdateValueTaxonomyUseCase(repo, CONFIG).execute({
      id,
      value: 'Promoción',
      actorUserId: null,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.value).toBe('Promoción');
    }
  });

  it('lista y elimina taxonomías', async () => {
    const created = await new CreateValueTaxonomyUseCase(repo, CONFIG).execute({ value: 'Oferta', actorUserId: null });
    const id = created.isOk() ? created.value.id : '';

    const list = await new ListValueTaxonomyUseCase(repo).execute();
    expect(list.isOk() && list.value).toHaveLength(1);

    const deleted = await new DeleteValueTaxonomyUseCase(repo, CONFIG).execute({ id, actorUserId: null });
    expect(deleted.isOk()).toBe(true);

    const afterDelete = await new GetValueTaxonomyUseCase(repo, CONFIG).execute(id);
    expect(afterDelete.isErr()).toBe(true);
    if (afterDelete.isErr()) {
      expect(afterDelete.error).toBeInstanceOf(ValueTaxonomyNotFoundError);
    }
  });
});
