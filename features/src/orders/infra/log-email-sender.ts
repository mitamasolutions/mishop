import { Injectable, Logger } from '@nestjs/common';
import type { EmailSender, OutboundEmail } from '../domain/email-sender';

/**
 * Adapter de log (fallback cuando no hay SMTP configurado). El job NO se
 * pierde: queda registrado en stdout para que un operador lo procese
 * manualmente o reenvíe (r24 · sprint1_cierre).
 */
@Injectable()
export class LogEmailSender implements EmailSender {
  private readonly logger = new Logger('LogEmailSender');

  async send(email: OutboundEmail): Promise<{ ok: boolean }> {
    this.logger.log(`[EMAIL] ${email.templateCode} → order=${email.orderId} job=${email.jobId} payload=${JSON.stringify(email.payload)}`);
    return { ok: true };
  }
}
