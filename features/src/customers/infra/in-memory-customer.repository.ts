import { normalizeEmail, Customer } from '../domain/customer.entity';
import type { CustomerRepository, ListCustomersFilter, PaginatedCustomers } from '../domain/customer.repository';

export class InMemoryCustomerRepository implements CustomerRepository {
  private readonly customers = new Map<string, Customer>();

  async findById(id: string): Promise<Customer | null> {
    return this.customers.get(id) ?? null;
  }

  async findByStoreAndEmail(storeId: string, email: string): Promise<Customer | null> {
    const normalized = normalizeEmail(email);
    return [...this.customers.values()].find((customer) => customer.storeId === storeId && customer.email === normalized) ?? null;
  }

  async findAll(filter: ListCustomersFilter): Promise<PaginatedCustomers> {
    const q = filter.q?.toLowerCase();
    const filtered = [...this.customers.values()].filter((c) => {
      if (filter.storeId && c.storeId !== filter.storeId) return false;
      if (q && ![c.email, c.firstName, c.lastName].some((value) => value.toLowerCase().includes(q))) return false;
      return true;
    });
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const pageSize = filter.pageSize && filter.pageSize > 0 ? filter.pageSize : 20;
    const start = (page - 1) * pageSize;
    return { items: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize };
  }

  async save(customer: Customer): Promise<void> {
    this.customers.set(customer.id, customer);
  }
}
