import { Entity } from '@mitama/core';
import { slugify } from './slug';

interface ProductCollectionProps {
  title: string;
  handle: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Colección: agrupación plana para marketing. Un producto puede estar en varias. */
export class ProductCollection extends Entity<ProductCollectionProps> {
  static create(props: { title: string; handle?: string | null }): ProductCollection {
    const now = new Date();
    const handle = props.handle ? slugify(props.handle) : slugify(props.title);
    return new ProductCollection(crypto.randomUUID(), { title: props.title, handle, createdAt: now, updatedAt: now });
  }

  static rehydrate(props: ProductCollectionProps, id: string): ProductCollection {
    return new ProductCollection(id, props);
  }

  get title(): string {
    return this.props.title;
  }

  get handle(): string {
    return this.props.handle;
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
  update(changes: { title?: string; handle?: string | null }): string | null {
    let previousHandle: string | null = null;

    if (changes.handle !== undefined && changes.handle !== null) {
      const next = slugify(changes.handle);
      if (next && next !== this.props.handle) {
        previousHandle = this.props.handle;
        this.props.handle = next;
      }
    }
    if (changes.title !== undefined) {
      this.props.title = changes.title;
    }
    this.props.updatedAt = new Date();
    return previousHandle;
  }
}
