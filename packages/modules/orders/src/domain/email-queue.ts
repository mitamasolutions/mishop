export type TransactionalEmailTemplateCode = 'order.created' | 'payment.paid' | 'order.cancelled';

export interface EmailQueue {
  enqueue(input: { orderId: string; templateCode: TransactionalEmailTemplateCode; payload: Record<string, unknown> }): Promise<void>;
}
