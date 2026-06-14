import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import type { StoreTaxSettings, StoreTaxSettingsRepository } from '../domain/store-tax-settings.repository';

@Injectable()
export class PrismaStoreTaxSettingsRepository implements StoreTaxSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByStore(storeId: string): Promise<StoreTaxSettings | null> {
    const row = await this.prisma.storeTaxSetting.findUnique({ where: { storeId } });
    return row ? { storeId: row.storeId, regionId: row.regionId, providerCode: row.providerCode, pricesIncludeTax: row.pricesIncludeTax } : null;
  }

  async save(settings: StoreTaxSettings): Promise<void> {
    await this.prisma.storeTaxSetting.upsert({ where: { storeId: settings.storeId }, create: settings, update: settings });
  }
}
