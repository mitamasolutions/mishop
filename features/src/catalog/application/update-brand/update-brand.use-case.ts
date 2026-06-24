import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { BrandHandleAlreadyInUseError, BrandNotFoundError } from '../../domain/errors';
import type { BrandRepository, SlugRedirect } from '../../domain/brand.repository';
import { toBrandOutput, type BrandOutput } from '../brand.dto';
import type { UpdateBrandInput } from './update-brand.dto';

export type UpdateBrandError = ValidationError | BrandNotFoundError | BrandHandleAlreadyInUseError;

export class UpdateBrandUseCase implements UseCase<UpdateBrandInput, Result<BrandOutput, UpdateBrandError>> {
  constructor(private readonly brands: BrandRepository) {}

  async execute(input: UpdateBrandInput): Promise<Result<BrandOutput, UpdateBrandError>> {
    const brand = await this.brands.findById(input.id);
    if (!brand) {
      return err(new BrandNotFoundError(input.id));
    }

    if (input.name !== undefined && !input.name.trim()) {
      return err(new ValidationError('El nombre de la marca es obligatorio'));
    }

    const previousHandle = brand.update({
      name: input.name?.trim(),
      handle: input.handle,
      logoUrl: input.logoUrl,
      description: input.description,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
    });

    // Si el slug cambió, verifica unicidad y prepara el redirect 301.
    let redirect: SlugRedirect | null = null;
    if (previousHandle) {
      const clash = await this.brands.findByHandle(brand.handle);
      if (clash && clash.id !== brand.id) {
        return err(new BrandHandleAlreadyInUseError(brand.handle));
      }
      redirect = {
        fromPath: `/marcas/${previousHandle}`,
        toPath: `/marcas/${brand.handle}`,
        entityType: 'brand',
      };
    }

    await this.brands.update(
      brand,
      {
        userId: input.actorUserId,
        storeId: null,
        action: 'brand.updated',
        entityType: 'brand',
        entityId: brand.id,
        diff: { name: brand.name, handle: brand.handle },
      },
      redirect,
    );

    return ok(toBrandOutput(brand));
  }
}
