import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/data';
import { Currency } from '../domain/currency.entity';
import type { CurrencyRepository } from '../domain/currency.repository';

@Injectable()
export class PrismaCurrencyRepository implements CurrencyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Currency[]> {
    const rows = await this.prisma.currency.findMany({
      where: { deletedAt: null },
      orderBy: { code: 'asc' },
    });
    return rows.map((row) =>
      Currency.rehydrate(row.code, {
        symbol: row.symbol,
        symbolNative: row.symbolNative,
        decimalDigits: row.decimalDigits,
        rounding: row.rounding,
        name: row.name,
      }),
    );
  }

  async findByCode(code: string): Promise<Currency | null> {
    const row = await this.prisma.currency.findFirst({ where: { code, deletedAt: null } });
    if (!row) {
      return null;
    }
    return Currency.rehydrate(row.code, {
      symbol: row.symbol,
      symbolNative: row.symbolNative,
      decimalDigits: row.decimalDigits,
      rounding: row.rounding,
      name: row.name,
    });
  }
}
