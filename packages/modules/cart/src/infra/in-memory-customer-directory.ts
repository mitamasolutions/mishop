import type { CustomerDirectory, IdentifyCustomerInput } from '../domain/customer-directory';

export class InMemoryCustomerDirectory implements CustomerDirectory {
  readonly customers = new Map<string, { id: string; storeId: string; email: string }>();

  async findOrCreateGuest(input: IdentifyCustomerInput): Promise<{ id: string }> {
    const key = `${input.storeId}:${input.email.toLowerCase()}`;
    const existing = this.customers.get(key);
    if (existing) return { id: existing.id };
    const id = crypto.randomUUID();
    this.customers.set(key, { id, storeId: input.storeId, email: input.email });
    return { id };
  }
}
