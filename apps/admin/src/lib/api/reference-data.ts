import { apiFetch } from '../api-client';
import type { CurrencyOutput, RegionOutput } from './types';

export function listCurrencies(): Promise<CurrencyOutput[]> {
  return apiFetch<CurrencyOutput[]>('/currencies', { skipAuth: true });
}

export function listRegions(): Promise<RegionOutput[]> {
  return apiFetch<RegionOutput[]>('/regions', { skipAuth: true });
}
