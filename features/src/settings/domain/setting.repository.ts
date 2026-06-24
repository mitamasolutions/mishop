import type { RecordActivityInput } from '../../activity-log';
import type { Setting } from './setting.entity';

export interface SettingRepository {
  /** Busca el valor exacto para `(key, storeId)`. `storeId: null` es el valor global. */
  findByKeyAndStore(key: string, storeId: string | null): Promise<Setting | null>;

  /**
   * Filas relevantes para resolver el catálogo completo en un scope: las
   * globales (`storeId: null`) más, si `storeId` no es `null`, los overrides
   * de esa tienda.
   */
  findAllForScope(storeId: string | null): Promise<Setting[]>;

  /** Crea o actualiza el valor y registra la actividad en la misma transacción. */
  upsert(setting: Setting, activity: RecordActivityInput): Promise<void>;
}
