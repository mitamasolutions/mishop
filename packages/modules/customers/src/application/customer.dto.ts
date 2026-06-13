import type { Customer, CustomerAddressProps } from '../domain/customer.entity';

export interface CustomerAddressOutput {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  province: string | null;
  postalCode: string | null;
  countryCode: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOutput {
  id: string;
  storeId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isGuest: boolean;
  emailVerifiedAt: string | null;
  addresses: CustomerAddressOutput[];
  createdAt: string;
  updatedAt: string;
}

export function toCustomerOutput(customer: Customer): CustomerOutput {
  return {
    id: customer.id,
    storeId: customer.storeId,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    isGuest: customer.isGuest,
    emailVerifiedAt: customer.emailVerifiedAt?.toISOString() ?? null,
    addresses: customer.addresses.map(toAddressOutput),
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

function toAddressOutput(address: CustomerAddressProps): CustomerAddressOutput {
  return {
    id: address.id,
    firstName: address.firstName,
    lastName: address.lastName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    province: address.province,
    postalCode: address.postalCode,
    countryCode: address.countryCode,
    isDefaultShipping: address.isDefaultShipping,
    isDefaultBilling: address.isDefaultBilling,
    createdAt: address.createdAt.toISOString(),
    updatedAt: address.updatedAt.toISOString(),
  };
}
