import { ok, Result, UseCase } from '@mitama/core';
import { Customer, normalizeEmail } from '../../domain/customer.entity';
import type { CustomerRepository } from '../../domain/customer.repository';
import { toCustomerOutput, type CustomerOutput } from '../customer.dto';

export interface CreateGuestCustomerInput {
  storeId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

export class CreateGuestCustomerUseCase implements UseCase<CreateGuestCustomerInput, Result<CustomerOutput, never>> {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(input: CreateGuestCustomerInput): Promise<Result<CustomerOutput, never>> {
    const email = normalizeEmail(input.email);
    const existing = await this.customers.findByStoreAndEmail(input.storeId, email);
    if (existing) {
      return ok(toCustomerOutput(existing));
    }

    const customer = Customer.guest({ ...input, email });
    await this.customers.save(customer);
    return ok(toCustomerOutput(customer));
  }
}
