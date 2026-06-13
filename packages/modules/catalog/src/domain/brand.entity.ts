import { Entity } from '@mitama/core';
import { slugify } from './slug';

interface BrandProps {
  name: string;
  handle: string;
  logoUrl: string | null;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Marca / fabricante. Entidad de primera clase con slug propio y SEO. */
export class Brand extends Entity<BrandProps> {
  static create(props: {
    name: string;
    handle?: string | null;
    logoUrl?: string | null;
    description?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
  }): Brand {
    const now = new Date();
    const handle = props.handle ? slugify(props.handle) : slugify(props.name);
    return new Brand(crypto.randomUUID(), {
      name: props.name,
      handle,
      logoUrl: props.logoUrl ?? null,
      description: props.description ?? null,
      metaTitle: props.metaTitle ?? null,
      metaDescription: props.metaDescription ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: BrandProps, id: string): Brand {
    return new Brand(id, props);
  }

  get name(): string {
    return this.props.name;
  }

  get handle(): string {
    return this.props.handle;
  }

  get logoUrl(): string | null {
    return this.props.logoUrl;
  }

  get description(): string | null {
    return this.props.description;
  }

  get metaTitle(): string | null {
    return this.props.metaTitle;
  }

  get metaDescription(): string | null {
    return this.props.metaDescription;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Aplica cambios. Devuelve el slug anterior si el slug cambió (para que el
   * caso de uso registre el redirect 301), o null si no cambió.
   */
  update(changes: {
    name?: string;
    handle?: string | null;
    logoUrl?: string | null;
    description?: string | null;
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
    if (changes.logoUrl !== undefined) {
      this.props.logoUrl = changes.logoUrl;
    }
    if (changes.description !== undefined) {
      this.props.description = changes.description;
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

  setActive(isActive: boolean): void {
    this.props.isActive = isActive;
    this.props.updatedAt = new Date();
  }
}
