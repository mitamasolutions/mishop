import { PaymentProvider } from './payment-provider.entity';

export interface PaymentProviderRepository {
  findAll(): Promise<PaymentProvider[]>;
  findById(id: string): Promise<PaymentProvider | null>;
  findByIds(ids: string[]): Promise<PaymentProvider[]>;
}
