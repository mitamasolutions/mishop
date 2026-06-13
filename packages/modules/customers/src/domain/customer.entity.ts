import { Entity } from '@mitama/core';

export interface CustomerAddressProps {
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
  createdAt: Date;
  updatedAt: Date;
}

interface CustomerProps {
  storeId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  passwordHash: string | null;
  isGuest: boolean;
  emailVerifiedAt: Date | null;
  addresses: CustomerAddressProps[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerAddressInput {
  firstName: string;
  lastName: string;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  province?: string | null;
  postalCode?: string | null;
  countryCode: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
}

export class Customer extends Entity<CustomerProps> {
  static registered(props: {
    storeId: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    passwordHash: string;
  }): Customer {
    const now = new Date();
    return new Customer(crypto.randomUUID(), {
      storeId: props.storeId,
      email: normalizeEmail(props.email),
      firstName: props.firstName,
      lastName: props.lastName,
      phone: props.phone ?? null,
      passwordHash: props.passwordHash,
      isGuest: false,
      emailVerifiedAt: null,
      addresses: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  static guest(props: { storeId: string; email: string; firstName: string; lastName: string; phone?: string | null }): Customer {
    const now = new Date();
    return new Customer(crypto.randomUUID(), {
      storeId: props.storeId,
      email: normalizeEmail(props.email),
      firstName: props.firstName,
      lastName: props.lastName,
      phone: props.phone ?? null,
      passwordHash: null,
      isGuest: true,
      emailVerifiedAt: null,
      addresses: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: CustomerProps, id: string): Customer {
    return new Customer(id, props);
  }

  get storeId(): string {
    return this.props.storeId;
  }

  get email(): string {
    return this.props.email;
  }

  get firstName(): string {
    return this.props.firstName;
  }

  get lastName(): string {
    return this.props.lastName;
  }

  get phone(): string | null {
    return this.props.phone;
  }

  get passwordHash(): string | null {
    return this.props.passwordHash;
  }

  get isGuest(): boolean {
    return this.props.isGuest;
  }

  get emailVerifiedAt(): Date | null {
    return this.props.emailVerifiedAt;
  }

  get addresses(): CustomerAddressProps[] {
    return this.props.addresses.map((address) => ({ ...address }));
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  convertGuestToAccount(passwordHash: string, profile?: { firstName?: string; lastName?: string; phone?: string | null }): void {
    if (profile?.firstName !== undefined) this.props.firstName = profile.firstName;
    if (profile?.lastName !== undefined) this.props.lastName = profile.lastName;
    if (profile?.phone !== undefined) this.props.phone = profile.phone;
    this.props.passwordHash = passwordHash;
    this.props.isGuest = false;
    this.props.updatedAt = new Date();
  }

  addAddress(input: CustomerAddressInput): CustomerAddressProps {
    const now = new Date();
    const address: CustomerAddressProps = {
      id: crypto.randomUUID(),
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone ?? null,
      line1: input.line1,
      line2: input.line2 ?? null,
      city: input.city,
      province: input.province ?? null,
      postalCode: input.postalCode ?? null,
      countryCode: input.countryCode.trim().toUpperCase(),
      isDefaultShipping: input.isDefaultShipping ?? this.props.addresses.length === 0,
      isDefaultBilling: input.isDefaultBilling ?? this.props.addresses.length === 0,
      createdAt: now,
      updatedAt: now,
    };
    this.props.addresses.push(address);
    this.normalizeDefaults(address);
    this.props.updatedAt = now;
    return { ...address };
  }

  updateAddress(addressId: string, input: Partial<CustomerAddressInput>): CustomerAddressProps | null {
    const address = this.props.addresses.find((candidate) => candidate.id === addressId);
    if (!address) return null;

    if (input.firstName !== undefined) address.firstName = input.firstName;
    if (input.lastName !== undefined) address.lastName = input.lastName;
    if (input.phone !== undefined) address.phone = input.phone;
    if (input.line1 !== undefined) address.line1 = input.line1;
    if (input.line2 !== undefined) address.line2 = input.line2;
    if (input.city !== undefined) address.city = input.city;
    if (input.province !== undefined) address.province = input.province;
    if (input.postalCode !== undefined) address.postalCode = input.postalCode;
    if (input.countryCode !== undefined) address.countryCode = input.countryCode.trim().toUpperCase();
    if (input.isDefaultShipping !== undefined) address.isDefaultShipping = input.isDefaultShipping;
    if (input.isDefaultBilling !== undefined) address.isDefaultBilling = input.isDefaultBilling;

    address.updatedAt = new Date();
    this.normalizeDefaults(address);
    this.props.updatedAt = address.updatedAt;
    return { ...address };
  }

  removeAddress(addressId: string): boolean {
    const previous = this.props.addresses.length;
    this.props.addresses = this.props.addresses.filter((address) => address.id !== addressId);
    if (this.props.addresses.length === previous) return false;

    this.props.updatedAt = new Date();
    return true;
  }

  private normalizeDefaults(selected: CustomerAddressProps): void {
    if (selected.isDefaultShipping) {
      for (const address of this.props.addresses) address.isDefaultShipping = address.id === selected.id;
    }
    if (selected.isDefaultBilling) {
      for (const address of this.props.addresses) address.isDefaultBilling = address.id === selected.id;
    }
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
