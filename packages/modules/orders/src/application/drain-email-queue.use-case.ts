import type { EmailJobsRepository } from '../domain/email-jobs.repository';
import type { EmailSender } from '../domain/email-sender';

const BACKOFF_BASE_MS = 60 * 1000; // 1 min · backoff exponencial 1m / 2m / 4m

export interface DrainEmailLogger {
  warn(message: string): void;
}
const noopLogger: DrainEmailLogger = { warn: () => {} };

/**
 * Drena la cola transaccional de emails (`OrderEmailJob`) con reintentos y
 * backoff (r24 · sprint1_cierre). Se ejecuta vía la tarea programada
 * `drain-email-queue` (cada 60s por defecto). Marca `processed` al éxito y
 * `failed` cuando excede `maxAttempts`; mientras tanto reagenda `nextRunAt`
 * con backoff exponencial.
 */
export class DrainEmailQueueUseCase {
  constructor(
    private readonly jobs: EmailJobsRepository,
    private readonly sender: EmailSender,
    private readonly logger: DrainEmailLogger = noopLogger,
  ) {}

  async execute(limit = 50): Promise<{ sent: string[]; retried: string[]; failed: string[] }> {
    const due = await this.jobs.findDue(new Date(), limit);
    const sent: string[] = [];
    const retried: string[] = [];
    const failed: string[] = [];

    for (const job of due) {
      const claimed = await this.jobs.claim(job.id);
      if (!claimed) continue;

      const attempts = job.attempts + 1;
      try {
        const result = await this.sender.send({
          jobId: job.id,
          orderId: job.orderId,
          templateCode: job.templateCode,
          payload: job.payload,
        });
        if (result.ok) {
          await this.jobs.markProcessed(job.id);
          sent.push(job.id);
        } else {
          await this.handleFailure(job.id, attempts, job.maxAttempts, result.error ?? 'send returned ok=false', retried, failed);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.handleFailure(job.id, attempts, job.maxAttempts, message, retried, failed);
      }
    }

    return { sent, retried, failed };
  }

  private async handleFailure(
    id: string,
    attempts: number,
    maxAttempts: number,
    error: string,
    retried: string[],
    failed: string[],
  ): Promise<void> {
    const backoffMs = BACKOFF_BASE_MS * Math.pow(2, Math.max(0, attempts - 1));
    await this.jobs.markFailure({
      id,
      attempts,
      maxAttempts,
      error,
      nextRunAt: new Date(Date.now() + backoffMs),
    });
    if (attempts >= maxAttempts) {
      this.logger.warn(`Job ${id} fallido tras ${attempts} intentos: ${error}`);
      failed.push(id);
    } else {
      retried.push(id);
    }
  }
}
