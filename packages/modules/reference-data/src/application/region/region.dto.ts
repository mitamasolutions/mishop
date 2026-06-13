export interface CreateRegionInput {
  name: string;
  currencyCode: string;
  actorUserId: string;
}

export interface CreateRegionOutput {
  regionId: string;
}

export interface UpdateRegionInput {
  regionId: string;
  name?: string;
  currencyCode?: string;
  countriesIso2?: string[];
  paymentProviderIds?: string[];
  actorUserId: string;
}

export interface DeactivateRegionInput {
  regionId: string;
  actorUserId: string;
}

export interface RegionDetailOutput {
  id: string;
  name: string;
  currencyCode: string;
  automaticTaxes: boolean;
  isActive: boolean;
  countriesIso2: string[];
  paymentProviderIds: string[];
}
