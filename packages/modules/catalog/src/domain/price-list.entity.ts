import { Entity } from '@mitama/core';

export type PriceListStatus = 'draft' | 'active';
export type PriceListType = 'sale' | 'override';

/** Precio override de una variante dentro de una lista de precios (campaña). */
export interface PriceListPriceProps {
  id: string;
  variantId: string;
  currencyCode: string;
  amount: number;
  minQuantity: number | null;
  maxQuantity: number | null;
}

interface PriceListProps {
  title: string;
  description: string | null;
  status: PriceListStatus;
  type: PriceListType;
  startsAt: Date | null;
  endsAt: Date | null;
  prices: PriceListPriceProps[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Lista de precios para campañas: sobreescribe precios de variantes durante
 * su vigencia (`startsAt`/`endsAt`). Solo aplica cuando `status === 'active'`
 * y la fecha de consulta está dentro de la vigencia (o no hay límites).
 */
export class PriceList extends Entity<PriceListProps> {
  static create(props: {
    title: string;
    description?: string | null;
    status?: PriceListStatus;
    type?: PriceListType;
    startsAt?: Date | null;
    endsAt?: Date | null;
  }): PriceList {
    const now = new Date();
    return new PriceList(crypto.randomUUID(), {
      title: props.title,
      description: props.description ?? null,
      status: props.status ?? 'draft',
      type: props.type ?? 'sale',
      startsAt: props.startsAt ?? null,
      endsAt: props.endsAt ?? null,
      prices: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: PriceListProps, id: string): PriceList {
    return new PriceList(id, props);
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string | null {
    return this.props.description;
  }

  get status(): PriceListStatus {
    return this.props.status;
  }

  get type(): PriceListType {
    return this.props.type;
  }

  get startsAt(): Date | null {
    return this.props.startsAt;
  }

  get endsAt(): Date | null {
    return this.props.endsAt;
  }

  get prices(): PriceListPriceProps[] {
    return this.props.prices.map((price) => ({ ...price }));
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  update(changes: {
    title?: string;
    description?: string | null;
    type?: PriceListType;
    startsAt?: Date | null;
    endsAt?: Date | null;
  }): 'ok' | 'invalid_date_range' {
    const startsAt = changes.startsAt !== undefined ? changes.startsAt : this.props.startsAt;
    const endsAt = changes.endsAt !== undefined ? changes.endsAt : this.props.endsAt;
    if (startsAt && endsAt && endsAt < startsAt) {
      return 'invalid_date_range';
    }
    if (changes.title !== undefined) {
      this.props.title = changes.title;
    }
    if (changes.description !== undefined) {
      this.props.description = changes.description;
    }
    if (changes.type !== undefined) {
      this.props.type = changes.type;
    }
    if (changes.startsAt !== undefined) {
      this.props.startsAt = changes.startsAt;
    }
    if (changes.endsAt !== undefined) {
      this.props.endsAt = changes.endsAt;
    }
    this.props.updatedAt = new Date();
    return 'ok';
  }

  setStatus(status: PriceListStatus): void {
    this.props.status = status;
    this.props.updatedAt = new Date();
  }

  /** Agrega un precio override para una variante. */
  addPrice(props: {
    variantId: string;
    currencyCode: string;
    amount: number;
    minQuantity?: number | null;
    maxQuantity?: number | null;
  }): PriceListPriceProps | 'invalid_range' {
    const minQuantity = props.minQuantity ?? null;
    const maxQuantity = props.maxQuantity ?? null;
    if (minQuantity !== null && (minQuantity < 1 || (maxQuantity !== null && maxQuantity < minQuantity))) {
      return 'invalid_range';
    }
    const price: PriceListPriceProps = {
      id: crypto.randomUUID(),
      variantId: props.variantId,
      currencyCode: props.currencyCode,
      amount: props.amount,
      minQuantity,
      maxQuantity,
    };
    this.props.prices.push(price);
    this.props.updatedAt = new Date();
    return { ...price };
  }

  updatePrice(
    priceId: string,
    changes: { amount?: number; minQuantity?: number | null; maxQuantity?: number | null },
  ): PriceListPriceProps | 'not_found' | 'invalid_range' {
    const price = this.props.prices.find((candidate) => candidate.id === priceId);
    if (!price) {
      return 'not_found';
    }
    const minQuantity = changes.minQuantity !== undefined ? changes.minQuantity : price.minQuantity;
    const maxQuantity = changes.maxQuantity !== undefined ? changes.maxQuantity : price.maxQuantity;
    if (minQuantity !== null && (minQuantity < 1 || (maxQuantity !== null && maxQuantity < minQuantity))) {
      return 'invalid_range';
    }
    if (changes.amount !== undefined) {
      price.amount = changes.amount;
    }
    price.minQuantity = minQuantity;
    price.maxQuantity = maxQuantity;
    this.props.updatedAt = new Date();
    return { ...price };
  }

  removePrice(priceId: string): boolean {
    const index = this.props.prices.findIndex((candidate) => candidate.id === priceId);
    if (index === -1) {
      return false;
    }
    this.props.prices.splice(index, 1);
    this.props.updatedAt = new Date();
    return true;
  }

  /** true si la lista está activa y la fecha dada cae dentro de su vigencia. */
  isActiveAt(at: Date): boolean {
    if (this.props.status !== 'active') {
      return false;
    }
    if (this.props.startsAt && at < this.props.startsAt) {
      return false;
    }
    if (this.props.endsAt && at > this.props.endsAt) {
      return false;
    }
    return true;
  }

  /**
   * Mejor precio override para una variante/moneda/cantidad, si la lista está
   * vigente. Entre varios tier prices aplicables, gana el de `minQuantity` mayor.
   */
  getPriceForVariant(variantId: string, currencyCode: string, quantity: number, at: Date): PriceListPriceProps | null {
    if (!this.isActiveAt(at)) {
      return null;
    }
    const candidates = this.props.prices.filter(
      (price) =>
        price.variantId === variantId &&
        price.currencyCode === currencyCode &&
        (price.minQuantity === null || price.minQuantity <= quantity) &&
        (price.maxQuantity === null || quantity <= price.maxQuantity),
    );
    if (candidates.length === 0) {
      return null;
    }
    return candidates.reduce((best, candidate) => ((candidate.minQuantity ?? 0) > (best.minQuantity ?? 0) ? candidate : best));
  }
}
