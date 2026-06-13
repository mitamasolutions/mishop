import { err, ok, Result, UseCase } from '@mitama/core';
import { BrandNotFoundError } from '../../domain/errors';
import type { BrandRepository } from '../../domain/brand.repository';
import { toBrandOutput, type BrandOutput } from '../brand.dto';

export interface SetBrandStatusInput {
  id: string;
  isActive: boolean;
  actorUserId: string | null;
}

export class SetBrandStatusUseCase
  implements UseCase<SetBrandStatusInput, Result<BrandOutput, BrandNotFoundError>>
{
  constructor(private readonly brands: BrandRepository) {}

  async execute(input: SetBrandStatusInput): Promise<Result<BrandOutput, BrandNotFoundError>> {
    const brand = await this.brands.findById(input.id);
    if (!brand) {
      return err(new BrandNotFoundError(input.id));
    }

    brand.setActive(input.isActive);

    await this.brands.update(
      brand,
      {
        userId: input.actorUserId,
        storeId: null,
        action: input.isActive ? 'brand.activated' : 'brand.deactivated',
        entityType: 'brand',
        entityId: brand.id,
        diff: { isActive: brand.isActive },
      },
      null,
    );

    return ok(toBrandOutput(brand));
  }
}
