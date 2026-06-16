import { err, ok, Result, UseCase } from '@mitama/core';
import type { CustomerRepository } from '../../domain/customer.repository';
import { CustomerNotFoundError } from '../../domain/errors';
import { toCustomerOutput, type CustomerOutput } from '../customer.dto';

export class GetCustomerUseCase implements UseCase<string, Result<CustomerOutput, CustomerNotFoundError>> {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(customerId: string): Promise<Result<CustomerOutput, CustomerNotFoundError>> {
    const customer = await this.customers.findById(customerId);
    if (!customer) return err(new CustomerNotFoundError(customerId));
    return ok(toCustomerOutput(customer));
  }
}
