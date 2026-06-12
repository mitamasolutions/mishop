import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { __Name__Item } from '../../domain/__name__-item.entity';
import type { __Name__ItemRepository } from '../../domain/__name__-item.repository';
import type { Create__Name__ItemInput, Create__Name__ItemOutput } from './create-__name__-item.dto';

/** Caso de uso de ejemplo: reemplázalo por la lógica real del módulo. */
export class Create__Name__ItemUseCase
  implements UseCase<Create__Name__ItemInput, Result<Create__Name__ItemOutput, ValidationError>>
{
  constructor(private readonly items: __Name__ItemRepository) {}

  async execute(
    input: Create__Name__ItemInput,
  ): Promise<Result<Create__Name__ItemOutput, ValidationError>> {
    const name = input.name.trim();
    if (name.length === 0) {
      return err(new ValidationError('El nombre no puede estar vacío'));
    }

    const item = __Name__Item.create({ name });
    await this.items.save(item);

    return ok({ itemId: item.id, name: item.name });
  }
}
