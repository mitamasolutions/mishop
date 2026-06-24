import { Entity } from '@mitama/core';

/** Nivel de stock de un item en una ubicación. `reservedQuantity` lo poblará el módulo de órdenes. */
export interface InventoryLevelProps {
  id: string;
  locationId: string;
  stockedQuantity: number;
  reservedQuantity: number;
  incomingQuantity: number;
}

interface InventoryItemProps {
  sku: string | null;
  title: string | null;
  requiresShipping: boolean;
  variantId: string | null;
  requiredQuantity: number;
  metadata: Record<string, unknown> | null;
  levels: InventoryLevelProps[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Ítem de inventario: lo que realmente se cuenta. Se enlaza 1–1 a una
 * variante de catálogo vía `variantId` (preparado para bundles a futuro
 * con `requiredQuantity`, hoy fijo en 1). El stock vive en `levels`,
 * uno por ubicación.
 */
export class InventoryItem extends Entity<InventoryItemProps> {
  static create(props: {
    sku?: string | null;
    title?: string | null;
    requiresShipping?: boolean;
    variantId?: string | null;
    requiredQuantity?: number;
    metadata?: Record<string, unknown> | null;
  }): InventoryItem {
    const now = new Date();
    return new InventoryItem(crypto.randomUUID(), {
      sku: props.sku ?? null,
      title: props.title ?? null,
      requiresShipping: props.requiresShipping ?? true,
      variantId: props.variantId ?? null,
      requiredQuantity: props.requiredQuantity ?? 1,
      metadata: props.metadata ?? null,
      levels: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: InventoryItemProps, id: string): InventoryItem {
    return new InventoryItem(id, props);
  }

  get sku(): string | null {
    return this.props.sku;
  }

  get title(): string | null {
    return this.props.title;
  }

  get requiresShipping(): boolean {
    return this.props.requiresShipping;
  }

  get variantId(): string | null {
    return this.props.variantId;
  }

  get requiredQuantity(): number {
    return this.props.requiredQuantity;
  }

  get metadata(): Record<string, unknown> | null {
    return this.props.metadata;
  }

  get levels(): InventoryLevelProps[] {
    return this.props.levels.map((level) => ({ ...level }));
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  update(changes: { sku?: string | null; title?: string | null; requiresShipping?: boolean }): void {
    if (changes.sku !== undefined) {
      this.props.sku = changes.sku;
    }
    if (changes.title !== undefined) {
      this.props.title = changes.title;
    }
    if (changes.requiresShipping !== undefined) {
      this.props.requiresShipping = changes.requiresShipping;
    }
    this.props.updatedAt = new Date();
  }

  findLevel(locationId: string): InventoryLevelProps | null {
    const level = this.props.levels.find((candidate) => candidate.locationId === locationId);
    return level ? { ...level } : null;
  }

  /** Crea o actualiza el nivel de stock de una ubicación (stocked/incoming). */
  setLevel(locationId: string, changes: { stockedQuantity?: number; incomingQuantity?: number }): InventoryLevelProps {
    const existing = this.props.levels.find((candidate) => candidate.locationId === locationId);
    if (existing) {
      if (changes.stockedQuantity !== undefined) {
        existing.stockedQuantity = changes.stockedQuantity;
      }
      if (changes.incomingQuantity !== undefined) {
        existing.incomingQuantity = changes.incomingQuantity;
      }
      this.props.updatedAt = new Date();
      return { ...existing };
    }

    const level: InventoryLevelProps = {
      id: crypto.randomUUID(),
      locationId,
      stockedQuantity: changes.stockedQuantity ?? 0,
      reservedQuantity: 0,
      incomingQuantity: changes.incomingQuantity ?? 0,
    };
    this.props.levels.push(level);
    this.props.updatedAt = new Date();
    return { ...level };
  }

  removeLevel(locationId: string): void {
    this.props.levels = this.props.levels.filter((level) => level.locationId !== locationId);
    this.props.updatedAt = new Date();
  }
}
