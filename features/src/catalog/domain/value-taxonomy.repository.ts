import type { RecordActivityInput } from '../../activity-log';
import type { ValueTaxonomy } from './value-taxonomy.entity';

/**
 * Puerto de persistencia compartido por las taxonomías de valor único
 * (tipos de producto, etiquetas). infra/ provee un adapter por tabla.
 */
export interface ValueTaxonomyRepository {
  findById(id: string): Promise<ValueTaxonomy | null>;
  findByValue(value: string): Promise<ValueTaxonomy | null>;
  findAll(): Promise<ValueTaxonomy[]>;
  create(entity: ValueTaxonomy, activity: RecordActivityInput): Promise<void>;
  update(entity: ValueTaxonomy, activity: RecordActivityInput): Promise<void>;
  delete(id: string, activity: RecordActivityInput): Promise<void>;
}
