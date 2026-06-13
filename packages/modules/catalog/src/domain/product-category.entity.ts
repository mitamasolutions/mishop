import { Entity } from '@mitama/core';
import { slugify } from './slug';

interface ProductCategoryProps {
  name: string;
  description: string | null;
  handle: string;
  /** Ruta de ancestros (ids separados por "."), vacía para categorías raíz. */
  mpath: string;
  isActive: boolean;
  isInternal: boolean;
  rank: number;
  parentCategoryId: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Categoría jerárquica (árbol con materialized path `mpath`). */
export class ProductCategory extends Entity<ProductCategoryProps> {
  static create(props: {
    name: string;
    description?: string | null;
    handle?: string | null;
    parentCategoryId?: string | null;
    parentMpath?: string;
    isActive?: boolean;
    isInternal?: boolean;
    rank?: number;
    metaTitle?: string | null;
    metaDescription?: string | null;
  }): ProductCategory {
    const now = new Date();
    const handle = props.handle ? slugify(props.handle) : slugify(props.name);
    const parentCategoryId = props.parentCategoryId ?? null;
    const mpath = parentCategoryId ? `${props.parentMpath ?? ''}${parentCategoryId}.` : '';
    return new ProductCategory(crypto.randomUUID(), {
      name: props.name,
      description: props.description ?? null,
      handle,
      mpath,
      isActive: props.isActive ?? true,
      isInternal: props.isInternal ?? false,
      rank: props.rank ?? 0,
      parentCategoryId,
      metaTitle: props.metaTitle ?? null,
      metaDescription: props.metaDescription ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: ProductCategoryProps, id: string): ProductCategory {
    return new ProductCategory(id, props);
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
  }

  get handle(): string {
    return this.props.handle;
  }

  get mpath(): string {
    return this.props.mpath;
  }

  /** Ruta completa (ancestros + esta categoría), usada como prefijo para descendientes. */
  get fullPath(): string {
    return `${this.props.mpath}${this.id}.`;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get isInternal(): boolean {
    return this.props.isInternal;
  }

  get rank(): number {
    return this.props.rank;
  }

  get parentCategoryId(): string | null {
    return this.props.parentCategoryId;
  }

  get metaTitle(): string | null {
    return this.props.metaTitle;
  }

  get metaDescription(): string | null {
    return this.props.metaDescription;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Aplica cambios de datos (sin tocar jerarquía). Devuelve el slug anterior si
   * el slug cambió (para que el caso de uso registre el redirect 301).
   */
  update(changes: {
    name?: string;
    description?: string | null;
    handle?: string | null;
    isActive?: boolean;
    isInternal?: boolean;
    metaTitle?: string | null;
    metaDescription?: string | null;
  }): string | null {
    let previousHandle: string | null = null;

    if (changes.handle !== undefined && changes.handle !== null) {
      const next = slugify(changes.handle);
      if (next && next !== this.props.handle) {
        previousHandle = this.props.handle;
        this.props.handle = next;
      }
    }
    if (changes.name !== undefined) {
      this.props.name = changes.name;
    }
    if (changes.description !== undefined) {
      this.props.description = changes.description;
    }
    if (changes.isActive !== undefined) {
      this.props.isActive = changes.isActive;
    }
    if (changes.isInternal !== undefined) {
      this.props.isInternal = changes.isInternal;
    }
    if (changes.metaTitle !== undefined) {
      this.props.metaTitle = changes.metaTitle;
    }
    if (changes.metaDescription !== undefined) {
      this.props.metaDescription = changes.metaDescription;
    }
    this.props.updatedAt = new Date();
    return previousHandle;
  }

  /**
   * Reasigna el padre y el rango (drag & drop). Devuelve la ruta completa
   * anterior, que el caso de uso usa como prefijo para recalcular el `mpath`
   * de los descendientes.
   */
  reparent(parentCategoryId: string | null, parentMpath: string, rank: number): string {
    const previousFullPath = this.fullPath;
    this.props.parentCategoryId = parentCategoryId;
    this.props.mpath = parentCategoryId ? `${parentMpath}${parentCategoryId}.` : '';
    this.props.rank = rank;
    this.props.updatedAt = new Date();
    return previousFullPath;
  }

  /** Sobrescribe directamente el `mpath` (usado para recalcular descendientes). */
  setMpath(mpath: string): void {
    this.props.mpath = mpath;
    this.props.updatedAt = new Date();
  }

  /**
   * Reasigna padre/mpath/rango sin recalcular el `mpath` (a diferencia de
   * `reparent`). Se usa al eliminar una categoría: sus hijos directos toman
   * el lugar de la categoría eliminada, heredando literalmente su `mpath`.
   */
  rehome(parentCategoryId: string | null, mpath: string, rank: number): void {
    this.props.parentCategoryId = parentCategoryId;
    this.props.mpath = mpath;
    this.props.rank = rank;
    this.props.updatedAt = new Date();
  }
}
