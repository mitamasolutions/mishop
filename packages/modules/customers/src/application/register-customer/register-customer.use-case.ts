import { err, ok, Result, UseCase } from '@mitama/core';
import { Customer, normalizeEmail } from '../../domain/customer.entity';
import type { CustomerRepository } from '../../domain/customer.repository';
import { CustomerEmailAlreadyExistsError } from '../../domain/errors';
import type { PasswordHasher } from '../../domain/password-hasher';
import { toCustomerOutput, type CustomerOutput } from '../customer.dto';

export interface RegisterCustomerInput {
  storeId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

export class RegisterCustomerUseCase implements UseCase<RegisterCustomerInput, Result<CustomerOutput, CustomerEmailAlreadyExistsError>> {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: RegisterCustomerInput): Promise<Result<CustomerOutput, CustomerEmailAlreadyExistsError>> {
    const email = normalizeEmail(input.email);
    const existing = await this.customers.findByStoreAndEmail(input.storeId, email);
    if (existing && !existing.isGuest) {
      return err(new CustomerEmailAlreadyExistsError(email));
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    if (existing?.isGuest) {
      existing.convertGuestToAccount(passwordHash, { firstName: input.firstName, lastName: input.lastName, phone: input.phone ?? null });
      await this.customers.save(existing);
      return ok(toCustomerOutput(existing));
    }

    const customer = Customer.registered({ ...input, email, passwordHash });
    await this.customers.save(customer);
    return ok(toCustomerOutput(customer));
  }
}
