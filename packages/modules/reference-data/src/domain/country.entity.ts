import { Entity } from '@mitama/core';

interface CountryProps {
  iso3: string;
  numCode: string;
  name: string;
  displayName: string;
}

/** Identidad por `iso2` (ISO 3166-1 alpha-2, p.ej. "MX"). */
export class Country extends Entity<CountryProps> {
  static rehydrate(iso2: string, props: CountryProps): Country {
    return new Country(iso2, props);
  }

  get iso2(): string {
    return this.id;
  }

  get iso3(): string {
    return this.props.iso3;
  }

  get numCode(): string {
    return this.props.numCode;
  }

  get name(): string {
    return this.props.name;
  }

  get displayName(): string {
    return this.props.displayName;
  }
}
