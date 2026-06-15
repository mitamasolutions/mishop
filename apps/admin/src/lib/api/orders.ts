import { apiFetch } from '../api-client';
import type { OrderOutput, OrderPaymentStatus, OrderStatus } from './types';

export interface ListOrdersFilter {
  status?: OrderStatus;
  paymentStatus?: OrderPaymentStatus;
  customerId?: string;
  channel?: string;
  orderNumber?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedOrders {
  items: OrderOutput[];
  total: number;
  page: number;
  pageSize: number;
}

function buildQuery(filter: ListOrdersFilter): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function listOrders(filter: ListOrdersFilter = {}): Promise<PaginatedOrders> {
  return apiFetch<PaginatedOrders>(`/orders${buildQuery(filter)}`);
}

export function getOrder(orderId: string): Promise<OrderOutput> {
  return apiFetch<OrderOutput>(`/orders/${orderId}`);
}

export interface TransitionInput {
  to: string;
  reason?: string | null;
}

export function changeOrderState(orderId: string, input: TransitionInput): Promise<OrderOutput> {
  return apiFetch<OrderOutput>(`/orders/${orderId}/order-state`, { method: 'POST', body: input });
}

export function changePaymentState(orderId: string, input: TransitionInput): Promise<OrderOutput> {
  return apiFetch<OrderOutput>(`/orders/${orderId}/payment-state`, { method: 'POST', body: input });
}

export function cancelOrder(orderId: string, reason?: string | null): Promise<OrderOutput> {
  return apiFetch<OrderOutput>(`/orders/${orderId}/cancel`, { method: 'POST', body: { reason: reason ?? null } });
}

export function addOrderNote(orderId: string, body: string): Promise<OrderOutput> {
  return apiFetch<OrderOutput>(`/orders/${orderId}/notes`, { method: 'POST', body: { body } });
}

export function resendOrderConfirmation(orderId: string): Promise<void> {
  return apiFetch<void>(`/orders/${orderId}/resend-confirmation`, { method: 'POST' });
}

export function releaseExpiredReservations(): Promise<{ released: string[] }> {
  return apiFetch<{ released: string[] }>(`/orders/maintenance/release-expired-reservations`, { method: 'POST' });
}
