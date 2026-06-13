import { Entity } from '@mitama/core';
import { randomUUID } from 'crypto';

interface RegionProps {
  name: string;
  currencyCode: string;
  automaticTaxes: boolean;
  isActive: boolean;
  /** Códigos ISO 3166-1 alfa-2 de los países asociados. Vacío en vistas de lista. */
  countriesIso2: string[];
  /** IDs de los proveedores de pago habilitados. Vacío en vistas de lista. */
  paymentProviderIds: string[];
}

export class Region extends Entity<RegionProps> {
  static rehydrate(id: string, props: RegionProps): Region {
    return new Region(id, props);
  }

  static create(props: { name: string; currencyCode: string }): Region {
    return new Region(randomUUID(), {
      name: props.name,
      currencyCode: props.currencyCode,
      automaticTaxes: true,
      isActive: true,
      countriesIso2: [],
      paymentProviderIds: [],
    });
  }

  get name(): string {
    return this.props.name;
  }

  get currencyCode(): string {
    return this.props.currencyCode;
  }

  get automaticTaxes(): boolean {
    return this.props.automaticTaxes;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get countriesIso2(): string[] {
    return this.props.countriesIso2;
  }

  get paymentProviderIds(): string[] {
    return this.props.paymentProviderIds;
  }

  update(
    changes: Partial<
      Pick<RegionProps, 'name' | 'currencyCode' | 'automaticTaxes' | 'countriesIso2' | 'paymentProviderIds'>
    >,
  ): Region {
    return new Region(this.id, { ...this.props, ...changes });
  }

  deactivate(): Region {
    return new Region(this.id, { ...this.props, isActive: false });
  }
}
