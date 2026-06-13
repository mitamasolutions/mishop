import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { Brand } from '../../domain/brand.entity';
import { BrandHandleAlreadyInUseError } from '../../domain/errors';
import type { BrandRepository } from '../../domain/brand.repository';
import { toBrandOutput, type BrandOutput } from '../brand.dto';
import type { CreateBrandInput } from './create-brand.dto';

export type CreateBrandError = ValidationError | BrandHandleAlreadyInUseError;

export class CreateBrandUseCase implements UseCase<CreateBrandInput, Result<BrandOutput, CreateBrandError>> {
  constructor(private readonly brands: BrandRepository) {}

  async execute(input: CreateBrandInput): Promise<Result<BrandOutput, CreateBrandError>> {
    const name = input.name.trim();
    if (!name) {
      return err(new ValidationError('El nombre de la marca es obligatorio'));
    }

    const brand = Brand.create({
      name,
      handle: input.handle ?? null,
      logoUrl: input.logoUrl ?? null,
      description: input.description ?? null,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
    });

    const existing = await this.brands.findByHandle(brand.handle);
    if (existing) {
      return err(new BrandHandleAlreadyInUseError(brand.handle));
    }

    await this.brands.create(brand, {
      userId: input.actorUserId,
      storeId: null,
      action: 'brand.created',
      entityType: 'brand',
      entityId: brand.id,
      diff: { name: brand.name, handle: brand.handle },
    });

    return ok(toBrandOutput(brand));
  }
}
