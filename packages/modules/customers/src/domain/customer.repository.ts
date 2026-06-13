import type { Customer } from './customer.entity';

export interface CustomerRepository {
  findById(id: string): Promise<Customer | null>;
  findByStoreAndEmail(storeId: string, email: string): Promise<Customer | null>;
  save(customer: Customer): Promise<void>;
}
