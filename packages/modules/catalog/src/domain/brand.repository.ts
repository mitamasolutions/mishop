import type { RecordActivityInput } from '@mitama/activity-log';
import { Brand } from './brand.entity';

/** Redirect 301 a registrar cuando cambia un slug (requisito SEO). */
export interface SlugRedirect {
  fromPath: string;
  toPath: string;
  entityType: string;
}

/**
 * Puerto de persistencia de marcas. infra/ lo implementa con Prisma,
 * escribiendo la mutación, el `recordActivity` y (si aplica) el redirect 301
 * en la misma transacción.
 */
export interface BrandRepository {
  findById(id: string): Promise<Brand | null>;
  findByHandle(handle: string): Promise<Brand | null>;
  findAll(): Promise<Brand[]>;
  create(brand: Brand, activity: RecordActivityInput): Promise<void>;
  update(brand: Brand, activity: RecordActivityInput, redirect: SlugRedirect | null): Promise<void>;
}
