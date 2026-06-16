import { Injectable } from '@nestjs/common';
import { __Name__Item } from '../domain/__name__-item.entity';
import type { __Name__ItemRepository } from '../domain/__name__-item.repository';

/**
 * Adapter in-memory de arranque. Cuando el módulo necesite persistencia real,
 * crea aquí un Prisma__Name__ItemRepository (y su .prisma en lib/db).
 */
@Injectable()
export class InMemory__Name__ItemRepository implements __Name__ItemRepository {
  private readonly items = new Map<string, __Name__Item>();

  async save(item: __Name__Item): Promise<void> {
    this.items.set(item.id, item);
  }

  async findById(id: string): Promise<__Name__Item | null> {
    return this.items.get(id) ?? null;
  }
}
