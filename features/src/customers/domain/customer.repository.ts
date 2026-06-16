import type { Customer } from './customer.entity';

export interface ListCustomersFilter {
  storeId?: string;
  /** Búsqueda parcial por email/nombre/apellido. */
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedCustomers {
  items: Customer[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomerRepository {
  findById(id: string): Promise<Customer | null>;
  findByStoreAndEmail(storeId: string, email: string): Promise<Customer | null>;
  findAll(filter: ListCustomersFilter): Promise<PaginatedCustomers>;
  save(customer: Customer): Promise<void>;
}
