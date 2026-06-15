import { apiFetch } from '../api-client';

export interface PaymentTransition {
  id: string;
  from: string;
  to: string;
  reason: string | null;
  createdAt: string;
}

export interface PaymentRefund {
  id: string;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed';
  providerReference: string | null;
  createdAt: string;
}

export interface PaymentOutput {
  id: string;
  storeId: string;
  orderId: string;
  providerCode: string;
  amount: number;
  currency: string;
  status: string;
  providerReference: string | null;
  createdAt: string;
  updatedAt: string;
  transitions: PaymentTransition[];
  refunds: PaymentRefund[];
}

export function listPaymentsByOrder(orderId: string): Promise<PaymentOutput[]> {
  return apiFetch<PaymentOutput[]>(`/payments/by-order/${orderId}`);
}

export function markPaymentPaid(paymentId: string): Promise<PaymentOutput> {
  return apiFetch<PaymentOutput>(`/payments/${paymentId}/manual-paid`, { method: 'POST' });
}

export function refundPayment(paymentId: string, amount: number): Promise<PaymentOutput> {
  return apiFetch<PaymentOutput>(`/payments/${paymentId}/refunds`, { method: 'POST', body: { amount } });
}

// ---- Payment methods admin -------------------------------------------------

export interface PaymentMethodFieldDescriptor {
  key: string;
  label: string;
  type: 'string' | 'secret' | 'boolean';
  required: boolean;
  description?: string;
}

export interface AdminPaymentMethod {
  method: {
    id: string;
    providerCode: string;
    displayName: string;
    enabled: boolean;
    captureMode: 'manual' | 'automatic';
  };
  status: 'configured' | 'misconfigured';
  misconfigurationReason?: string;
  descriptor: { fields: PaymentMethodFieldDescriptor[] } | null;
}

export interface RegisteredProvider {
  code: string;
  displayName: string;
  descriptor: { fields: PaymentMethodFieldDescriptor[] };
}

export function listAdminPaymentMethods(): Promise<AdminPaymentMethod[]> {
  return apiFetch<AdminPaymentMethod[]>('/payments/methods/admin');
}

export function listRegisteredProviders(): Promise<RegisteredProvider[]> {
  return apiFetch<RegisteredProvider[]>('/payments/methods/registered');
}

export interface ConfigureMethodInput {
  displayName?: string;
  enabled?: boolean;
  webhookSecret?: string | null;
  captureMode?: 'manual' | 'automatic';
  credentials?: Record<string, unknown>;
}

export function configurePaymentMethod(providerCode: string, input: ConfigureMethodInput) {
  return apiFetch<AdminPaymentMethod['method']>(`/payments/methods/${providerCode}`, { method: 'PUT', body: input });
}
