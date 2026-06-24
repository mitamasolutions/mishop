import type { TerritoryShipping } from '../../domain/territory.entity';

export interface CreateTerritoryInput {
  regionId: string;
  name: string;
  code: string;
  shipping?: Partial<TerritoryShipping>;
  actorUserId: string;
}

export interface CreateTerritoryOutput {
  territoryId: string;
}

export interface UpdateTerritoryInput {
  territoryId: string;
  name?: string;
  code?: string;
  isActive?: boolean;
  shipping?: Partial<TerritoryShipping>;
  actorUserId: string;
}

export interface DeactivateTerritoryInput {
  territoryId: string;
  actorUserId: string;
}

export interface TerritoryOutput {
  id: string;
  regionId: string;
  name: string;
  code: string;
  isActive: boolean;
  automaticFulfillment: boolean;
  minSubtotal: number | null;
  minSubtotalWithTax: boolean;
  freeShippingThreshold: number | null;
  freeShippingThresholdWithTax: boolean;
  freeShippingNoDiscount: boolean;
  shippingCost: number | null;
  description: string | null;
}
