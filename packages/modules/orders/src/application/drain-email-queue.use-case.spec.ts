import { describe, expect, it } from 'vitest';
import type { EmailJobFailure, EmailJobRecord, EmailJobsRepository } from '../domain/email-jobs.repository';
import type { EmailSender, OutboundEmail } from '../domain/email-sender';
import { DrainEmailQueueUseCase } from './drain-email-queue.use-case';

class InMemoryJobs implements EmailJobsRepository {
  readonly jobs = new Map<string, EmailJobRecord & { status: 'queued' | 'processed' | 'failed'; nextRunAt: Date; lastError: string | null }>();
  add(job: EmailJobRecord, nextRunAt: Date = new Date(0)): void {
    this.jobs.set(job.id, { ...job, status: 'queued', nextRunAt, lastError: null });
  }
  async findDue(now: Date, limit: number): Promise<EmailJobRecord[]> {
    return [...this.jobs.values()]
      .filter((j) => j.status === 'queued' && j.nextRunAt <= now)
      .slice(0, limit)
      .map(({ id, orderId, templateCode, payload, attempts, maxAttempts }) => ({ id, orderId, templateCode, payload, attempts, maxAttempts }));
  }
  async claim(id: string): Promise<boolean> {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'queued') return false;
    job.attempts += 1;
    return true;
  }
  async markProcessed(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (job) job.status = 'processed';
  }
  async markFailure(failure: EmailJobFailure): Promise<void> {
    const job = this.jobs.get(failure.id);
    if (!job) return;
    job.lastError = failure.error;
    if (failure.attempts >= failure.maxAttempts) job.status = 'failed';
    else job.nextRunAt = failure.nextRunAt;
  }
}

class FlakySender implements EmailSender {
  constructor(private readonly behavior: Array<{ ok: boolean; error?: string } | 'throw'>) {}
  attempt = 0;
  async send(_email: OutboundEmail): Promise<{ ok: boolean; error?: string }> {
    const result = this.behavior[this.attempt++] ?? { ok: true };
    if (result === 'throw') throw new Error('SMTP down');
    return result;
  }
}

describe('DrainEmailQueueUseCase (r24 · sprint1_cierre)', () => {
  const baseJob: EmailJobRecord = {
    id: 'job-1',
    orderId: 'order-1',
    templateCode: 'order.created',
    payload: { orderNumber: 'WEB-1' },
    attempts: 0,
    maxAttempts: 3,
  };

  it('marca processed cuando el envío fue ok', async () => {
    const jobs = new InMemoryJobs();
    jobs.add(baseJob);
    const useCase = new DrainEmailQueueUseCase(jobs, new FlakySender([{ ok: true }]));

    const result = await useCase.execute();
    expect(result.sent).toEqual(['job-1']);
    expect(jobs.jobs.get('job-1')?.status).toBe('processed');
  });

  it('reintenta con backoff cuando el sender falla y deja queued con nextRunAt futuro', async () => {
    const jobs = new InMemoryJobs();
    jobs.add(baseJob);
    const useCase = new DrainEmailQueueUseCase(jobs, new FlakySender(['throw']));

    const result = await useCase.execute();
    expect(result.retried).toEqual(['job-1']);
    const job = jobs.jobs.get('job-1');
    expect(job?.status).toBe('queued');
    expect(job?.nextRunAt.getTime()).toBeGreaterThan(Date.now());
    expect(job?.lastError).toContain('SMTP down');
  });

  it('marca failed al exceder maxAttempts (no se pierde el job)', async () => {
    const jobs = new InMemoryJobs();
    jobs.add({ ...baseJob, attempts: 2, maxAttempts: 3 }); // próximo intento es el tercero (== max)
    const useCase = new DrainEmailQueueUseCase(jobs, new FlakySender(['throw']));

    const result = await useCase.execute();
    expect(result.failed).toEqual(['job-1']);
    expect(jobs.jobs.get('job-1')?.status).toBe('failed');
  });
});
