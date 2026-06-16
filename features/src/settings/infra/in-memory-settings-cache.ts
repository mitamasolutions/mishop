import type { CachedSetting, SettingsCache } from '../domain/settings-cache';

/** Cache en memoria por proceso. Usable tanto en DI de producción como en tests. */
export class InMemorySettingsCache implements SettingsCache {
  private readonly entries = new Map<string, CachedSetting>();

  private keyFor(key: string, storeId: string | null): string {
    return `${storeId ?? 'global'}:${key}`;
  }

  get(key: string, storeId: string | null): CachedSetting | undefined {
    return this.entries.get(this.keyFor(key, storeId));
  }

  set(key: string, storeId: string | null, entry: CachedSetting): void {
    this.entries.set(this.keyFor(key, storeId), entry);
  }

  invalidateKey(key: string): void {
    for (const cacheKey of this.entries.keys()) {
      if (cacheKey.endsWith(`:${key}`)) {
        this.entries.delete(cacheKey);
      }
    }
  }
}
