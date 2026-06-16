import { Entity } from '@mitama/core';

interface StoreProps {
  name: string;
  code: string;
  url: string | null;
  currencyCode: string;
  regionId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Tienda. No se borra físicamente: solo se activa/desactiva. */
export class Store extends Entity<StoreProps> {
  static create(props: {
    name: string;
    code: string;
    url: string | null;
    currencyCode: string;
    regionId: string;
  }): Store {
    const now = new Date();
    return new Store(crypto.randomUUID(), { ...props, isActive: true, createdAt: now, updatedAt: now });
  }

  /** Reconstruye la entidad desde persistencia, sin regenerar id ni fechas. */
  static rehydrate(props: StoreProps, id: string): Store {
    return new Store(id, props);
  }

  get name(): string {
    return this.props.name;
  }

  get code(): string {
    return this.props.code;
  }

  get url(): string | null {
    return this.props.url;
  }

  get currencyCode(): string {
    return this.props.currencyCode;
  }

  get regionId(): string {
    return this.props.regionId;
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

  update(changes: { name?: string; url?: string | null; currencyCode?: string; regionId?: string }): void {
    if (changes.name !== undefined) {
      this.props.name = changes.name;
    }
    if (changes.url !== undefined) {
      this.props.url = changes.url;
    }
    if (changes.currencyCode !== undefined) {
      this.props.currencyCode = changes.currencyCode;
    }
    if (changes.regionId !== undefined) {
      this.props.regionId = changes.regionId;
    }
    this.props.updatedAt = new Date();
  }

  setActive(isActive: boolean): void {
    this.props.isActive = isActive;
    this.props.updatedAt = new Date();
  }
}
