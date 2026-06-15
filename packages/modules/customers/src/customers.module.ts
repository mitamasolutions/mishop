/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Module } from '@nestjs/common';
import { CUSTOMERS_TOKENS } from './customers.tokens';
import type { CustomerRepository } from './domain/customer.repository';
import type { PasswordHasher } from './domain/password-hasher';
import { RegisterCustomerUseCase } from './application/register-customer/register-customer.use-case';
import { CreateGuestCustomerUseCase } from './application/create-guest-customer/create-guest-customer.use-case';
import { GetCustomerUseCase } from './application/get-customer/get-customer.use-case';
import { ListCustomersUseCase } from './application/list-customers/list-customers.use-case';
import { ManageCustomerAddressUseCase } from './application/manage-customer-address/manage-customer-address.use-case';
import { PrismaCustomerRepository } from './infra/prisma-customer.repository';
import { Argon2PasswordHasher } from './infra/argon2-password-hasher';
import { CustomersController } from './http/customers.controller';

@Module({
  controllers: [CustomersController],
  providers: [
    { provide: CUSTOMERS_TOKENS.customerRepository, useClass: PrismaCustomerRepository },
    { provide: CUSTOMERS_TOKENS.passwordHasher, useClass: Argon2PasswordHasher },
    {
      provide: RegisterCustomerUseCase,
      useFactory: (customers: CustomerRepository, passwordHasher: PasswordHasher) =>
        new RegisterCustomerUseCase(customers, passwordHasher),
      inject: [CUSTOMERS_TOKENS.customerRepository, CUSTOMERS_TOKENS.passwordHasher],
    },
    {
      provide: CreateGuestCustomerUseCase,
      useFactory: (customers: CustomerRepository) => new CreateGuestCustomerUseCase(customers),
      inject: [CUSTOMERS_TOKENS.customerRepository],
    },
    {
      provide: GetCustomerUseCase,
      useFactory: (customers: CustomerRepository) => new GetCustomerUseCase(customers),
      inject: [CUSTOMERS_TOKENS.customerRepository],
    },
    {
      provide: ListCustomersUseCase,
      useFactory: (customers: CustomerRepository) => new ListCustomersUseCase(customers),
      inject: [CUSTOMERS_TOKENS.customerRepository],
    },
    {
      provide: ManageCustomerAddressUseCase,
      useFactory: (customers: CustomerRepository) => new ManageCustomerAddressUseCase(customers),
      inject: [CUSTOMERS_TOKENS.customerRepository],
    },
  ],
  exports: [CUSTOMERS_TOKENS.customerRepository],
})
export class CustomersModule {}
