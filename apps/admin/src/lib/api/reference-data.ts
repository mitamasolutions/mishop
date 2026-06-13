import { apiFetch } from '../api-client';
import type {
  CountryOutput,
  CurrencyOutput,
  PaymentProviderOutput,
  RegionDetailOutput,
  RegionOutput,
  TerritoryOutput,
  ZoneOutput,
} from './types';

// ── Catálogos de solo lectura ─────────────────────────────────────────────────

export function listCurrencies(): Promise<CurrencyOutput[]> {
  return apiFetch<CurrencyOutput[]>('/currencies', { skipAuth: true });
}

export function listCountries(): Promise<CountryOutput[]> {
  return apiFetch<CountryOutput[]>('/countries', { skipAuth: true });
}

export function listPaymentProviders(): Promise<PaymentProviderOutput[]> {
  return apiFetch<PaymentProviderOutput[]>('/payment-providers', { skipAuth: true });
}

// ── Regiones ──────────────────────────────────────────────────────────────────

export function listRegions(): Promise<RegionOutput[]> {
  return apiFetch<RegionOutput[]>('/regions', { skipAuth: true });
}

export function getRegion(id: string): Promise<RegionDetailOutput> {
  return apiFetch<RegionDetailOutput>(`/regions/${id}`, { skipAuth: true });
}

export function createRegion(name: string, currencyCode: string): Promise<{ regionId: string }> {
  return apiFetch('/regions', { method: 'POST', body: { name, currencyCode } });
}

export function updateRegion(
  id: string,
  input: { name?: string; currencyCode?: string; countriesIso2?: string[]; paymentProviderIds?: string[] },
): Promise<void> {
  return apiFetch(`/regions/${id}`, { method: 'PATCH', body: input });
}

export function deactivateRegion(id: string): Promise<void> {
  return apiFetch(`/regions/${id}`, { method: 'DELETE' });
}

// ── Territorios ───────────────────────────────────────────────────────────────

export function listTerritoriesByRegion(regionId: string): Promise<TerritoryOutput[]> {
  return apiFetch<TerritoryOutput[]>(`/regions/${regionId}/territories`);
}

export function getTerritory(id: string): Promise<TerritoryOutput> {
  return apiFetch<TerritoryOutput>(`/territories/${id}`);
}

export function createTerritory(
  regionId: string,
  input: {
    name: string;
    code: string;
    automaticFulfillment?: boolean;
    minSubtotal?: number | null;
    minSubtotalWithTax?: boolean;
    freeShippingThreshold?: number | null;
    freeShippingThresholdWithTax?: boolean;
    freeShippingNoDiscount?: boolean;
    shippingCost?: number | null;
    description?: string | null;
  },
): Promise<{ territoryId: string }> {
  return apiFetch(`/regions/${regionId}/territories`, { method: 'POST', body: input });
}

export function updateTerritory(
  id: string,
  input: {
    name?: string;
    code?: string;
    isActive?: boolean;
    automaticFulfillment?: boolean;
    minSubtotal?: number | null;
    minSubtotalWithTax?: boolean;
    freeShippingThreshold?: number | null;
    freeShippingThresholdWithTax?: boolean;
    freeShippingNoDiscount?: boolean;
    shippingCost?: number | null;
    description?: string | null;
  },
): Promise<void> {
  return apiFetch(`/territories/${id}`, { method: 'PATCH', body: input });
}

export function deactivateTerritory(id: string): Promise<void> {
  return apiFetch(`/territories/${id}`, { method: 'DELETE' });
}

// ── Zonas ─────────────────────────────────────────────────────────────────────

export function listZonesByTerritory(territoryId: string): Promise<ZoneOutput[]> {
  return apiFetch<ZoneOutput[]>(`/territories/${territoryId}/zones`);
}

export function createZone(
  territoryId: string,
  input: { name: string; code: string; description?: string | null },
): Promise<{ zoneId: string }> {
  return apiFetch(`/territories/${territoryId}/zones`, { method: 'POST', body: input });
}

export function updateZone(
  id: string,
  input: { name?: string; code?: string; isActive?: boolean; description?: string | null },
): Promise<void> {
  return apiFetch(`/zones/${id}`, { method: 'PATCH', body: input });
}

export function deactivateZone(id: string): Promise<void> {
  return apiFetch(`/zones/${id}`, { method: 'DELETE' });
}
