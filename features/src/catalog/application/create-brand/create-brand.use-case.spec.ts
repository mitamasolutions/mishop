import { beforeEach, describe, expect, it } from 'vitest';
import type { RecordActivityInput } from '../../../activity-log';
import { ValidationError } from '@mitama/core';
import { CreateBrandUseCase } from './create-brand.use-case';
import { UpdateBrandUseCase } from '../update-brand/update-brand.use-case';
import { Brand } from '../../domain/brand.entity';
import { BrandHandleAlreadyInUseError } from '../../domain/errors';
import type { BrandRepository, SlugRedirect } from '../../domain/brand.repository';

class InMemoryBrandRepository implements BrandRepository {
  readonly brands = new Map<string, Brand>();
  readonly activities: RecordActivityInput[] = [];
  readonly redirects: SlugRedirect[] = [];

  async findById(id: string): Promise<Brand | null> {
    return this.brands.get(id) ?? null;
  }

  async findByHandle(handle: string): Promise<Brand | null> {
    for (const brand of this.brands.values()) {
      if (brand.handle === handle) {
        return brand;
      }
    }
    return null;
  }

  async findAll(): Promise<Brand[]> {
    return [...this.brands.values()];
  }

  async create(brand: Brand, activity: RecordActivityInput): Promise<void> {
    this.brands.set(brand.id, brand);
    this.activities.push(activity);
  }

  async update(brand: Brand, activity: RecordActivityInput, redirect: SlugRedirect | null): Promise<void> {
    this.brands.set(brand.id, brand);
    this.activities.push(activity);
    if (redirect) {
      this.redirects.push(redirect);
    }
  }
}

describe('CreateBrandUseCase', () => {
  let brands: InMemoryBrandRepository;
  let useCase: CreateBrandUseCase;

  beforeEach(() => {
    brands = new InMemoryBrandRepository();
    useCase = new CreateBrandUseCase(brands);
  });

  it('crea una marca y autogenera el slug desde el nombre', async () => {
    const result = await useCase.execute({ name: 'Niké Pro', actorUserId: 'user-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.handle).toBe('nike-pro');
      expect(result.value.isActive).toBe(true);
    }
    expect(brands.activities[0]?.action).toBe('brand.created');
  });

  it('falla con ValidationError si el nombre está vacío', async () => {
    const result = await useCase.execute({ name: '   ', actorUserId: null });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });

  it('falla con BrandHandleAlreadyInUseError si el slug ya existe', async () => {
    await useCase.execute({ name: 'Nike', actorUserId: null });
    const result = await useCase.execute({ name: 'Nike', actorUserId: null });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(BrandHandleAlreadyInUseError);
    }
  });
});

describe('UpdateBrandUseCase', () => {
  let brands: InMemoryBrandRepository;

  beforeEach(() => {
    brands = new InMemoryBrandRepository();
  });

  it('registra un redirect 301 cuando cambia el slug', async () => {
    const created = await new CreateBrandUseCase(brands).execute({ name: 'Adidas', actorUserId: null });
    expect(created.isOk()).toBe(true);
    const id = created.isOk() ? created.value.id : '';

    const result = await new UpdateBrandUseCase(brands).execute({
      id,
      handle: 'adidas-originals',
      actorUserId: null,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.handle).toBe('adidas-originals');
    }
    expect(brands.redirects).toHaveLength(1);
    expect(brands.redirects[0]).toMatchObject({
      fromPath: '/marcas/adidas',
      toPath: '/marcas/adidas-originals',
      entityType: 'brand',
    });
  });

  it('no registra redirect si el slug no cambia', async () => {
    const created = await new CreateBrandUseCase(brands).execute({ name: 'Puma', actorUserId: null });
    const id = created.isOk() ? created.value.id : '';

    await new UpdateBrandUseCase(brands).execute({ id, description: 'Marca deportiva', actorUserId: null });

    expect(brands.redirects).toHaveLength(0);
  });
});
