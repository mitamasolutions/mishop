/**
 * Repositorio de la cola de emails transaccionales (r24 · sprint1_cierre).
 * El uso del puerto desde application mantiene la regla 2 (Prisma vive en
 * infra/) y permite testear `DrainEmailQueueUseCase` con un adapter
 * in-memory.
 */
export interface EmailJobRecord {
  id: string;
  orderId: string;
  templateCode: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
}

export interface EmailJobFailure {
  id: string;
  /** Si `attempts >= maxAttempts`, el repo lo marca `failed`. */
  attempts: number;
  maxAttempts: number;
  error: string;
  /** Cuándo reintentar (UTC). Solo relevante si no se marca `failed`. */
  nextRunAt: Date;
}

export interface EmailJobsRepository {
  findDue(now: Date, limit: number): Promise<EmailJobRecord[]>;
  /**
   * Intento de claim atómico (incrementa `attempts` solo si todavía está
   * `queued`). Devuelve `true` si ganamos la carrera.
   */
  claim(id: string): Promise<boolean>;
  markProcessed(id: string): Promise<void>;
  markFailure(failure: EmailJobFailure): Promise<void>;
}
