import { normalizeEmail, Customer } from '../domain/customer.entity';
import type { CustomerRepository } from '../domain/customer.repository';

export class InMemoryCustomerRepository implements CustomerRepository {
  private readonly customers = new Map<string, Customer>();

  async findById(id: string): Promise<Customer | null> {
    return this.customers.get(id) ?? null;
  }

  async findByStoreAndEmail(storeId: string, email: string): Promise<Customer | null> {
    const normalized = normalizeEmail(email);
    return [...this.customers.values()].find((customer) => customer.storeId === storeId && customer.email === normalized) ?? null;
  }

  async save(customer: Customer): Promise<void> {
    this.customers.set(customer.id, customer);
  }
}
