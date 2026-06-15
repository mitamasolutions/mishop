import { Injectable } from '@nestjs/common';
import type { MercadoPagoClient } from './mercado-pago-payment.provider';
import type { PaymentStatus } from '../domain/payment.entity';

const MP_API = 'https://api.mercadopago.com';

/**
 * Cliente HTTP de Mercado Pago (r14 · sprint1_cierre). Implementación
 * mínima sobre `fetch`, suficiente para Checkout Pro del MVP. Se puede
 * sustituir por la SDK oficial sin tocar al `MercadoPagoPaymentProvider`
 * porque el contrato vive en el puerto.
 *
 * Tolerante a fallos: propaga el error al provider para que decida si es
 * transitorio (HTTP 5xx, timeouts) o permanente.
 */
@Injectable()
export class HttpMercadoPagoClient implements MercadoPagoClient {
  async createPreference(input: { accessToken: string; paymentId: string; orderId: string; amount: number; currency: string }): Promise<{ preferenceId: string; initPoint: string }> {
    const body = {
      items: [
        {
          id: input.orderId,
          title: `Orden ${input.orderId}`,
          quantity: 1,
          currency_id: input.currency,
          unit_price: input.amount,
        },
      ],
      external_reference: input.paymentId,
    };
    const res = await fetch(`${MP_API}/checkout/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${input.accessToken}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Mercado Pago createPreference falló: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { id: string; init_point: string };
    return { preferenceId: data.id, initPoint: data.init_point };
  }

  async refundPayment(input: { accessToken: string; providerPaymentId: string; amount: number; refundId: string }): Promise<{ refundId: string }> {
    const res = await fetch(`${MP_API}/v1/payments/${input.providerPaymentId}/refunds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${input.accessToken}`,
        'X-Idempotency-Key': input.refundId,
      },
      body: JSON.stringify({ amount: input.amount }),
    });
    if (!res.ok) {
      throw new Error(`Mercado Pago refundPayment falló: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { id: number | string };
    return { refundId: String(data.id) };
  }

  async getPaymentStatus(input: { accessToken: string; providerPaymentId: string }): Promise<{ status: PaymentStatus; amount: number | null }> {
    const res = await fetch(`${MP_API}/v1/payments/${input.providerPaymentId}`, {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Mercado Pago getPaymentStatus falló: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { status: string; transaction_amount?: number };
    return { status: mapStatus(data.status), amount: data.transaction_amount ?? null };
  }
}

function mapStatus(mpStatus: string): PaymentStatus {
  switch (mpStatus) {
    case 'approved':
      return 'paid';
    case 'pending':
    case 'in_process':
      return 'pending';
    case 'authorized':
      return 'authorized';
    case 'rejected':
      return 'failed';
    case 'refunded':
      return 'refunded';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}
