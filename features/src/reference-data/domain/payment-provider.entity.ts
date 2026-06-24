import { Entity } from '@mitama/core';

interface PaymentProviderProps {
  code: string;
  name: string;
}

export class PaymentProvider extends Entity<PaymentProviderProps> {
  static rehydrate(id: string, props: PaymentProviderProps): PaymentProvider {
    return new PaymentProvider(id, props);
  }

  get code(): string {
    return this.props.code;
  }

  get name(): string {
    return this.props.name;
  }
}
