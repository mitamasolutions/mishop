/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Module } from '@nestjs/common';
import { createModuleProviders } from '@mitama/contracts';
import { CUSTOMERS_TOKENS } from './customers.tokens';
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
  providers: createModuleProviders([
    { provide: CUSTOMERS_TOKENS.customerRepository, useClass: PrismaCustomerRepository },
    { provide: CUSTOMERS_TOKENS.passwordHasher, useClass: Argon2PasswordHasher },
    { useCase: RegisterCustomerUseCase, inject: [CUSTOMERS_TOKENS.customerRepository, CUSTOMERS_TOKENS.passwordHasher] },
    { useCase: CreateGuestCustomerUseCase, inject: [CUSTOMERS_TOKENS.customerRepository] },
    { useCase: GetCustomerUseCase, inject: [CUSTOMERS_TOKENS.customerRepository] },
    { useCase: ListCustomersUseCase, inject: [CUSTOMERS_TOKENS.customerRepository] },
    { useCase: ManageCustomerAddressUseCase, inject: [CUSTOMERS_TOKENS.customerRepository] },
  ]),
  exports: [CUSTOMERS_TOKENS.customerRepository],
})
export class CustomersModule {}
