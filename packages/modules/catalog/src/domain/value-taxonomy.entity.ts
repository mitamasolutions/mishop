import { Entity } from '@mitama/core';

interface ValueTaxonomyProps {
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Taxonomía plana de valor único (tipos de producto, etiquetas): una lista de
 * etiquetas reutilizables, sin jerarquía ni SEO propio.
 */
export class ValueTaxonomy extends Entity<ValueTaxonomyProps> {
  static create(value: string): ValueTaxonomy {
    const now = new Date();
    return new ValueTaxonomy(crypto.randomUUID(), { value, createdAt: now, updatedAt: now });
  }

  static rehydrate(props: ValueTaxonomyProps, id: string): ValueTaxonomy {
    return new ValueTaxonomy(id, props);
  }

  get value(): string {
    return this.props.value;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  rename(value: string): void {
    this.props.value = value;
    this.props.updatedAt = new Date();
  }
}
