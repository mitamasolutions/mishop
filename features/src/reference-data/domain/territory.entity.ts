import { Entity } from '@mitama/core';
import { randomUUID } from 'crypto';

export interface TerritoryShipping {
  automaticFulfillment: boolean;
  minSubtotal: number | null;
  minSubtotalWithTax: boolean;
  freeShippingThreshold: number | null;
  freeShippingThresholdWithTax: boolean;
  freeShippingNoDiscount: boolean;
  shippingCost: number | null;
  description: string | null;
}

interface TerritoryProps extends TerritoryShipping {
  regionId: string;
  name: string;
  code: string;
  isActive: boolean;
}

export class Territory extends Entity<TerritoryProps> {
  static rehydrate(id: string, props: TerritoryProps): Territory {
    return new Territory(id, props);
  }

  static create(props: {
    regionId: string;
    name: string;
    code: string;
    shipping?: Partial<TerritoryShipping>;
  }): Territory {
    return new Territory(randomUUID(), {
      regionId: props.regionId,
      name: props.name,
      code: props.code,
      isActive: true,
      automaticFulfillment: props.shipping?.automaticFulfillment ?? false,
      minSubtotal: props.shipping?.minSubtotal ?? null,
      minSubtotalWithTax: props.shipping?.minSubtotalWithTax ?? false,
      freeShippingThreshold: props.shipping?.freeShippingThreshold ?? null,
      freeShippingThresholdWithTax: props.shipping?.freeShippingThresholdWithTax ?? false,
      freeShippingNoDiscount: props.shipping?.freeShippingNoDiscount ?? false,
      shippingCost: props.shipping?.shippingCost ?? null,
      description: props.shipping?.description ?? null,
    });
  }

  get regionId(): string {
    return this.props.regionId;
  }

  get name(): string {
    return this.props.name;
  }

  get code(): string {
    return this.props.code;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get automaticFulfillment(): boolean {
    return this.props.automaticFulfillment;
  }

  get minSubtotal(): number | null {
    return this.props.minSubtotal;
  }

  get minSubtotalWithTax(): boolean {
    return this.props.minSubtotalWithTax;
  }

  get freeShippingThreshold(): number | null {
    return this.props.freeShippingThreshold;
  }

  get freeShippingThresholdWithTax(): boolean {
    return this.props.freeShippingThresholdWithTax;
  }

  get freeShippingNoDiscount(): boolean {
    return this.props.freeShippingNoDiscount;
  }

  get shippingCost(): number | null {
    return this.props.shippingCost;
  }

  get description(): string | null {
    return this.props.description;
  }

  update(
    changes: Partial<
      Pick<TerritoryProps, 'name' | 'code' | 'isActive'> & TerritoryShipping
    >,
  ): Territory {
    return new Territory(this.id, { ...this.props, ...changes });
  }

  deactivate(): Territory {
    return new Territory(this.id, { ...this.props, isActive: false });
  }
}
