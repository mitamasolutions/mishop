export type TransactionalEmailTemplateCode = 'order.created' | 'payment.paid' | 'payment.refunded' | 'order.cancelled' | 'shipment.shipped' | 'shipment.delivered';

export interface EmailQueue {
  enqueue(input: { orderId: string; templateCode: TransactionalEmailTemplateCode; payload: Record<string, unknown> }): Promise<void>;
}
