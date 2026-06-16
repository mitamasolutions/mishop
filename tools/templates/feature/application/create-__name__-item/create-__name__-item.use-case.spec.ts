/**
 * Test del caso de uso con adapter in-memory: sin Prisma, sin NestJS.
 */
import { describe, expect, it } from 'vitest';
import { ValidationError } from '@mitama/core';
import { Create__Name__ItemUseCase } from './create-__name__-item.use-case';
import { InMemory__Name__ItemRepository } from '../../infra/in-memory-__name__-item.repository';

describe('Create__Name__ItemUseCase', () => {
  it('crea un item y lo persiste', async () => {
    const items = new InMemory__Name__ItemRepository();
    const useCase = new Create__Name__ItemUseCase(items);

    const result = await useCase.execute({ name: 'Ejemplo' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const saved = await items.findById(result.value.itemId);
      expect(saved?.name).toBe('Ejemplo');
    }
  });

  it('falla con ValidationError si el nombre está vacío', async () => {
    const useCase = new Create__Name__ItemUseCase(new InMemory__Name__ItemRepository());

    const result = await useCase.execute({ name: '   ' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });
});
