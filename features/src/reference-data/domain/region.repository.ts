import type { RecordActivityInput } from '@mitama/activity-log';
import { Region } from './region.entity';

export interface RegionRepository {
  /** Lista regiones activas (sin asociaciones). */
  findAll(): Promise<Region[]>;
  /** Busca por id (sin asociaciones). */
  findById(id: string): Promise<Region | null>;
  /** Busca por id incluyendo países y proveedores de pago. */
  findByIdWithDetails(id: string): Promise<Region | null>;
  /** Persiste una región nueva o actualizada (incluye asociaciones). */
  save(region: Region, activity: RecordActivityInput): Promise<void>;
  /** Soft-delete: marca deletedAt y persiste isActive=false. */
  softDelete(id: string, activity: RecordActivityInput): Promise<void>;
  /** True si la región tiene territorios o tiendas activos. */
  hasActiveDependencies(id: string): Promise<boolean>;
}
