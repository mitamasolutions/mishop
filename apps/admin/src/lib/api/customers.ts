import { apiFetch } from '../api-client';

export interface CustomerAddress {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  province: string | null;
  postalCode: string | null;
  countryCode: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
}

export interface CustomerOutput {
  id: string;
  storeId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isGuest: boolean;
  createdAt: string;
  updatedAt: string;
  addresses: CustomerAddress[];
}

export interface ListCustomersFilter {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedCustomers {
  items: CustomerOutput[];
  total: number;
  page: number;
  pageSize: number;
}

function buildQuery(filter: ListCustomersFilter): string {
  const params = new URLSearchParams();
  if (filter.q) params.set('q', filter.q);
  if (filter.page) params.set('page', String(filter.page));
  if (filter.pageSize) params.set('pageSize', String(filter.pageSize));
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function listCustomers(filter: ListCustomersFilter = {}): Promise<PaginatedCustomers> {
  return apiFetch<PaginatedCustomers>(`/customers${buildQuery(filter)}`);
}

export function getCustomer(customerId: string): Promise<CustomerOutput> {
  return apiFetch<CustomerOutput>(`/customers/${customerId}`);
}
