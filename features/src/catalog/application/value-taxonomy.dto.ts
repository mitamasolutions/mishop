import type { ValueTaxonomy } from '../domain/value-taxonomy.entity';

export interface ValueTaxonomyOutput {
  id: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export function toValueTaxonomyOutput(entity: ValueTaxonomy): ValueTaxonomyOutput {
  return {
    id: entity.id,
    value: entity.value,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
