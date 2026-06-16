import { Entity } from '@mitama/core';

interface StockLocationProps {
  name: string;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Ubicación física de stock (almacén, tienda, etc.). No se borra: solo se activa/desactiva. */
export class StockLocation extends Entity<StockLocationProps> {
  static create(props: { name: string; metadata?: Record<string, unknown> | null }): StockLocation {
    const now = new Date();
    return new StockLocation(crypto.randomUUID(), {
      name: props.name,
      isActive: true,
      metadata: props.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: StockLocationProps, id: string): StockLocation {
    return new StockLocation(id, props);
  }

  get name(): string {
    return this.props.name;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get metadata(): Record<string, unknown> | null {
    return this.props.metadata;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  update(changes: { name?: string; metadata?: Record<string, unknown> | null }): void {
    if (changes.name !== undefined) {
      this.props.name = changes.name;
    }
    if (changes.metadata !== undefined) {
      this.props.metadata = changes.metadata;
    }
    this.props.updatedAt = new Date();
  }

  setActive(isActive: boolean): void {
    this.props.isActive = isActive;
    this.props.updatedAt = new Date();
  }
}
