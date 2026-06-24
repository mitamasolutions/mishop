import { err, ok, Result, UseCase } from '@mitama/core';
import type { CustomerAddressInput } from '../../domain/customer.entity';
import type { CustomerRepository } from '../../domain/customer.repository';
import { CustomerAddressNotFoundError, CustomerNotFoundError } from '../../domain/errors';
import { toCustomerOutput, type CustomerOutput } from '../customer.dto';

export type ManageCustomerAddressInput =
  | ({ action: 'add'; customerId: string } & CustomerAddressInput)
  | ({ action: 'update'; customerId: string; addressId: string } & Partial<CustomerAddressInput>)
  | { action: 'remove'; customerId: string; addressId: string };

export class ManageCustomerAddressUseCase
  implements UseCase<ManageCustomerAddressInput, Result<CustomerOutput, CustomerNotFoundError | CustomerAddressNotFoundError>>
{
  constructor(private readonly customers: CustomerRepository) {}

  async execute(input: ManageCustomerAddressInput): Promise<Result<CustomerOutput, CustomerNotFoundError | CustomerAddressNotFoundError>> {
    const customer = await this.customers.findById(input.customerId);
    if (!customer) return err(new CustomerNotFoundError(input.customerId));

    if (input.action === 'add') {
      customer.addAddress(input);
    } else if (input.action === 'update') {
      const updated = customer.updateAddress(input.addressId, input);
      if (!updated) return err(new CustomerAddressNotFoundError(input.addressId));
    } else {
      const removed = customer.removeAddress(input.addressId);
      if (!removed) return err(new CustomerAddressNotFoundError(input.addressId));
    }

    await this.customers.save(customer);
    return ok(toCustomerOutput(customer));
  }
}
