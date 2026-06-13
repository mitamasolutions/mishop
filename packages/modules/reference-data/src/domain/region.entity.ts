import { Entity } from '@mitama/core';

interface RegionProps {
  name: string;
  currencyCode: string;
  automaticTaxes: boolean;
}

export class Region extends Entity<RegionProps> {
  static rehydrate(id: string, props: RegionProps): Region {
    return new Region(id, props);
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
}
