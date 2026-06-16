import { beforeEach, describe, expect, it } from 'vitest';
import type { RecordActivityInput } from '../../../activity-log';
import { ValidationError } from '@mitama/core';
import { CreateCategoryUseCase } from './create-category.use-case';
import { UpdateCategoryUseCase } from '../update-category/update-category.use-case';
import { MoveCategoryUseCase } from '../move-category/move-category.use-case';
import { DeleteCategoryUseCase } from '../delete-category/delete-category.use-case';
import { ProductCategory } from '../../domain/product-category.entity';
import {
  CategoryHandleAlreadyInUseError,
  CategoryInvalidParentError,
  ProductCategoryNotFoundError,
} from '../../domain/errors';
import type { ProductCategoryRepository } from '../../domain/product-category.repository';
import type { SlugRedirect } from '../../domain/brand.repository';

class InMemoryCategoryRepository implements ProductCategoryRepository {
  readonly categories = new Map<string, ProductCategory>();
  readonly activities: RecordActivityInput[] = [];
  readonly redirects: SlugRedirect[] = [];

  async findById(id: string): Promise<ProductCategory | null> {
    return this.categories.get(id) ?? null;
  }

  async findByHandle(handle: string): Promise<ProductCategory | null> {
    for (const category of this.categories.values()) {
      if (category.handle === handle) {
        return category;
      }
    }
    return null;
  }

  async findAll(): Promise<ProductCategory[]> {
    return [...this.categories.values()];
  }

  async findChildren(parentCategoryId: string | null): Promise<ProductCategory[]> {
    return [...this.categories.values()].filter((category) => category.parentCategoryId === parentCategoryId);
  }

  async findDescendants(category: ProductCategory): Promise<ProductCategory[]> {
    return [...this.categories.values()].filter((candidate) => candidate.mpath.startsWith(category.fullPath));
  }

  async create(category: ProductCategory, activity: RecordActivityInput): Promise<void> {
    this.categories.set(category.id, category);
    this.activities.push(activity);
  }

  async update(category: ProductCategory, activity: RecordActivityInput, redirect: SlugRedirect | null): Promise<void> {
    this.categories.set(category.id, category);
    this.activities.push(activity);
    if (redirect) {
      this.redirects.push(redirect);
    }
  }

  async move(category: ProductCategory, descendants: ProductCategory[], activity: RecordActivityInput): Promise<void> {
    this.categories.set(category.id, category);
    for (const descendant of descendants) {
      this.categories.set(descendant.id, descendant);
    }
    this.activities.push(activity);
  }

  async remove(category: ProductCategory, reparented: ProductCategory[], activity: RecordActivityInput): Promise<void> {
    for (const node of reparented) {
      this.categories.set(node.id, node);
    }
    this.categories.delete(category.id);
    this.activities.push(activity);
  }
}

describe('CreateCategoryUseCase', () => {
  let categories: InMemoryCategoryRepository;

  beforeEach(() => {
    categories = new InMemoryCategoryRepository();
  });

  it('crea una categoría raíz y autogenera el slug desde el nombre', async () => {
    const result = await new CreateCategoryUseCase(categories).execute({ name: 'Ropa', actorUserId: 'user-1' });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.handle).toBe('ropa');
      expect(result.value.mpath).toBe('');
    }
  });

  it('crea una subcategoría con el mpath del padre', async () => {
    const parent = await new CreateCategoryUseCase(categories).execute({ name: 'Ropa', actorUserId: null });
    const parentId = parent.isOk() ? parent.value.id : '';

    const result = await new CreateCategoryUseCase(categories).execute({
      name: 'Camisas',
      parentCategoryId: parentId,
      actorUserId: null,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.parentCategoryId).toBe(parentId);
      expect(result.value.mpath).toBe(`${parentId}.`);
    }
  });

  it('falla con ValidationError si el nombre está vacío', async () => {
    const result = await new CreateCategoryUseCase(categories).execute({ name: '  ', actorUserId: null });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });

  it('falla con CategoryHandleAlreadyInUseError si el slug ya existe', async () => {
    await new CreateCategoryUseCase(categories).execute({ name: 'Ropa', actorUserId: null });
    const result = await new CreateCategoryUseCase(categories).execute({ name: 'Ropa', actorUserId: null });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(CategoryHandleAlreadyInUseError);
    }
  });

  it('falla con ProductCategoryNotFoundError si el padre no existe', async () => {
    const result = await new CreateCategoryUseCase(categories).execute({
      name: 'Camisas',
      parentCategoryId: 'no-existe',
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ProductCategoryNotFoundError);
    }
  });
});

describe('UpdateCategoryUseCase', () => {
  let categories: InMemoryCategoryRepository;

  beforeEach(() => {
    categories = new InMemoryCategoryRepository();
  });

  it('registra un redirect 301 cuando cambia el slug', async () => {
    const created = await new CreateCategoryUseCase(categories).execute({ name: 'Ofertas', actorUserId: null });
    const id = created.isOk() ? created.value.id : '';

    const result = await new UpdateCategoryUseCase(categories).execute({
      id,
      handle: 'ofertas-especiales',
      actorUserId: null,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.handle).toBe('ofertas-especiales');
    }
    expect(categories.redirects).toHaveLength(1);
    expect(categories.redirects[0]).toMatchObject({
      fromPath: '/categorias/ofertas',
      toPath: '/categorias/ofertas-especiales',
      entityType: 'product_category',
    });
  });
});

describe('MoveCategoryUseCase', () => {
  let categories: InMemoryCategoryRepository;

  beforeEach(() => {
    categories = new InMemoryCategoryRepository();
  });

  async function createCategory(name: string, parentCategoryId?: string) {
    const result = await new CreateCategoryUseCase(categories).execute({ name, parentCategoryId, actorUserId: null });
    if (!result.isOk()) {
      throw new Error('No se pudo crear la categoría de prueba');
    }
    return result.value;
  }

  it('reasigna el padre y recalcula el mpath de los descendientes', async () => {
    const ropa = await createCategory('Ropa');
    const calzado = await createCategory('Calzado');
    const camisas = await createCategory('Camisas', ropa.id);
    const camisasFormales = await createCategory('Camisas Formales', camisas.id);

    const result = await new MoveCategoryUseCase(categories).execute({
      id: camisas.id,
      parentCategoryId: calzado.id,
      rank: 0,
      actorUserId: null,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.parentCategoryId).toBe(calzado.id);
      expect(result.value.mpath).toBe(`${calzado.id}.`);
    }

    const updatedGrandchild = await categories.findById(camisasFormales.id);
    expect(updatedGrandchild?.mpath).toBe(`${calzado.id}.${camisas.id}.`);
  });

  it('falla con CategoryInvalidParentError si se intenta mover dentro de su propia descendencia', async () => {
    const ropa = await createCategory('Ropa');
    const camisas = await createCategory('Camisas', ropa.id);

    const result = await new MoveCategoryUseCase(categories).execute({
      id: ropa.id,
      parentCategoryId: camisas.id,
      rank: 0,
      actorUserId: null,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(CategoryInvalidParentError);
    }
  });

  it('falla con CategoryInvalidParentError si una categoría se asigna como su propio padre', async () => {
    const ropa = await createCategory('Ropa');

    const result = await new MoveCategoryUseCase(categories).execute({
      id: ropa.id,
      parentCategoryId: ropa.id,
      rank: 0,
      actorUserId: null,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(CategoryInvalidParentError);
    }
  });
});

describe('DeleteCategoryUseCase', () => {
  let categories: InMemoryCategoryRepository;

  beforeEach(() => {
    categories = new InMemoryCategoryRepository();
  });

  async function createCategory(name: string, parentCategoryId?: string) {
    const result = await new CreateCategoryUseCase(categories).execute({ name, parentCategoryId, actorUserId: null });
    if (!result.isOk()) {
      throw new Error('No se pudo crear la categoría de prueba');
    }
    return result.value;
  }

  it('reasigna los hijos directos un nivel hacia arriba y recalcula descendientes', async () => {
    const ropa = await createCategory('Ropa');
    const camisas = await createCategory('Camisas', ropa.id);
    const camisasFormales = await createCategory('Camisas Formales', camisas.id);

    const result = await new DeleteCategoryUseCase(categories).execute({ id: camisas.id, actorUserId: null });
    expect(result.isOk()).toBe(true);

    expect(await categories.findById(camisas.id)).toBeNull();

    const promoted = await categories.findById(camisasFormales.id);
    expect(promoted?.parentCategoryId).toBe(ropa.id);
    expect(promoted?.mpath).toBe(`${ropa.id}.`);
  });

  it('falla con ProductCategoryNotFoundError si la categoría no existe', async () => {
    const result = await new DeleteCategoryUseCase(categories).execute({ id: 'no-existe', actorUserId: null });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ProductCategoryNotFoundError);
    }
  });
});
