import { __Name__Item } from './__name__-item.entity';

/** Puerto de persistencia. infra/ lo implementa (in-memory hoy, Prisma después). */
export interface __Name__ItemRepository {
  save(item: __Name__Item): Promise<void>;
  findById(id: string): Promise<__Name__Item | null>;
}
