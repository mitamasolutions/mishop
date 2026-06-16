import type { RecordActivityInput } from '../../activity-log';
import { Setting } from '../domain/setting.entity';
import type { SettingRepository } from '../domain/setting.repository';

/** Adapter in-memory para tests de los casos de uso, sin Prisma. */
export class InMemorySettingRepository implements SettingRepository {
  readonly settings = new Map<string, Setting>();

  private keyFor(key: string, storeId: string | null): string {
    return `${storeId ?? 'global'}:${key}`;
  }

  async findByKeyAndStore(key: string, storeId: string | null): Promise<Setting | null> {
    return this.settings.get(this.keyFor(key, storeId)) ?? null;
  }

  async findAllForScope(storeId: string | null): Promise<Setting[]> {
    return [...this.settings.values()].filter((setting) => setting.storeId === null || setting.storeId === storeId);
  }

  async upsert(setting: Setting, _activity: RecordActivityInput): Promise<void> {
    this.settings.set(this.keyFor(setting.key, setting.storeId), setting);
  }
}
