import { describe, expect, it } from 'vitest';
import { InMemoryCustomerRepository } from '../infra/in-memory-customer.repository';
import { StaticPasswordHasher } from '../infra/static-password-hasher';
import { CreateGuestCustomerUseCase } from './create-guest-customer/create-guest-customer.use-case';
import { ManageCustomerAddressUseCase } from './manage-customer-address/manage-customer-address.use-case';
import { RegisterCustomerUseCase } from './register-customer/register-customer.use-case';

describe('customers use cases', () => {
  it('rechaza email duplicado en la misma tienda y permite otra tienda', async () => {
    const customers = new InMemoryCustomerRepository();
    const register = new RegisterCustomerUseCase(customers, new StaticPasswordHasher());

    const first = await register.execute({ storeId: 'store-1', email: 'ANA@EXAMPLE.COM', password: 'password123', firstName: 'Ana', lastName: 'Paz' });
    expect(first.isOk()).toBe(true);

    const duplicated = await register.execute({ storeId: 'store-1', email: 'ana@example.com', password: 'password123', firstName: 'Ana', lastName: 'Paz' });
    expect(duplicated.isErr()).toBe(true);

    const otherStore = await register.execute({ storeId: 'store-2', email: 'ana@example.com', password: 'password123', firstName: 'Ana', lastName: 'Paz' });
    expect(otherStore.isOk()).toBe(true);
  });

  it('convierte un invitado en cuenta con el mismo email', async () => {
    const customers = new InMemoryCustomerRepository();
    const guest = new CreateGuestCustomerUseCase(customers);
    const register = new RegisterCustomerUseCase(customers, new StaticPasswordHasher());

    const createdGuest = (await guest.execute({ storeId: 'store-1', email: 'guest@example.com', firstName: 'G', lastName: 'U' })).value;
    expect(createdGuest.isGuest).toBe(true);

    const converted = await register.execute({ storeId: 'store-1', email: 'guest@example.com', password: 'password123', firstName: 'Guest', lastName: 'User' });
    expect(converted.isOk()).toBe(true);
    if (converted.isOk()) {
      expect(converted.value.id).toBe(createdGuest.id);
      expect(converted.value.isGuest).toBe(false);
    }
  });

  it('gestiona varias direcciones y defaults separados', async () => {
    const customers = new InMemoryCustomerRepository();
    const register = new RegisterCustomerUseCase(customers, new StaticPasswordHasher());
    const address = new ManageCustomerAddressUseCase(customers);
    const customer = (await register.execute({ storeId: 'store-1', email: 'a@b.com', password: 'password123', firstName: 'A', lastName: 'B' })).value;

    await address.execute({ action: 'add', customerId: customer.id, firstName: 'A', lastName: 'B', line1: 'Uno', city: 'CDMX', countryCode: 'mx' });
    const updated = await address.execute({ action: 'add', customerId: customer.id, firstName: 'A', lastName: 'B', line1: 'Dos', city: 'CDMX', countryCode: 'mx', isDefaultShipping: true });

    expect(updated.isOk()).toBe(true);
    if (updated.isOk()) {
      expect(updated.value.addresses).toHaveLength(2);
      expect(updated.value.addresses.filter((candidate) => candidate.isDefaultShipping)).toHaveLength(1);
    }
  });
});
