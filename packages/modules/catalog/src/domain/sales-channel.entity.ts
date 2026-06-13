import { Entity } from '@mitama/core';

interface SalesChannelProps {
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Canal de venta: determina en qué escaparate/tienda es visible un producto. */
export class SalesChannel extends Entity<SalesChannelProps> {
  static create(props: { name: string; description?: string | null }): SalesChannel {
    const now = new Date();
    return new SalesChannel(crypto.randomUUID(), {
      name: props.name,
      description: props.description ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: SalesChannelProps, id: string): SalesChannel {
    return new SalesChannel(id, props);
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
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

  update(changes: { name?: string; description?: string | null }): void {
    if (changes.name !== undefined) {
      this.props.name = changes.name;
    }
    if (changes.description !== undefined) {
      this.props.description = changes.description;
    }
    this.props.updatedAt = new Date();
  }

  setActive(isActive: boolean): void {
    this.props.isActive = isActive;
    this.props.updatedAt = new Date();
  }
}
