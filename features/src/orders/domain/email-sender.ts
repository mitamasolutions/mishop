/**
 * Puerto de envío real de emails transaccionales (r24 · sprint1_cierre).
 * El adapter SMTP usa `nodemailer` (no obligatorio en MVP); si no hay
 * SMTP configurado, el adapter `Log` registra el job sin perderlo.
 *
 * El `DrainEmailQueueUseCase` consume `OrderEmailJob` (status=queued,
 * nextRunAt<=now) y delega aquí; reintenta con backoff hasta `maxAttempts`.
 */
export interface OutboundEmail {
  jobId: string;
  orderId: string;
  templateCode: string;
  payload: Record<string, unknown>;
}

export interface EmailSender {
  send(email: OutboundEmail): Promise<{ ok: boolean; error?: string }>;
}
