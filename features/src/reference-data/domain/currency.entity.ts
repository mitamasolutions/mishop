import { Entity } from '@mitama/core';

interface CurrencyProps {
  symbol: string;
  symbolNative: string;
  decimalDigits: number;
  rounding: number;
  name: string;
}

/** Identidad por `code` (ISO 4217, p.ej. "MXN"). */
export class Currency extends Entity<CurrencyProps> {
  static rehydrate(code: string, props: CurrencyProps): Currency {
    return new Currency(code, props);
  }

  get code(): string {
    return this.id;
  }

  get symbol(): string {
    return this.props.symbol;
  }

  get symbolNative(): string {
    return this.props.symbolNative;
  }

  get decimalDigits(): number {
    return this.props.decimalDigits;
  }

  get rounding(): number {
    return this.props.rounding;
  }

  get name(): string {
    return this.props.name;
  }
}
