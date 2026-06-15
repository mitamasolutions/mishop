export interface ScheduledTaskProps {
  id: string;
  name: string;
  /** Handler registrado en el `ScheduledTaskRegistry`. */
  type: string;
  /** Intervalo de ejecución en segundos (entero positivo). */
  seconds: number;
  enabled: boolean;
  stopOnError: boolean;
  lastStartUtc: Date | null;
  lastEndUtc: Date | null;
  lastSuccessUtc: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledTaskRepository {
  findAll(): Promise<ScheduledTaskProps[]>;
  findById(id: string): Promise<ScheduledTaskProps | null>;
  findByName(name: string): Promise<ScheduledTaskProps | null>;
  /**
   * Devuelve las tareas due: habilitadas y con `lastStartUtc + seconds <= now`
   * (o nunca corridas). El orden es estable por `name` para que el runner
   * sea determinista.
   */
  findDue(now: Date): Promise<ScheduledTaskProps[]>;
  /**
   * Intento de **claim** atómico: marca `last_start_utc=now` solo si la fila
   * todavía no fue claimada (compara contra `expectedLastStartUtc`). Devuelve
   * `true` si esta instancia gana la carrera y debe ejecutar la tarea.
   */
  claim(id: string, now: Date, expectedLastStartUtc: Date | null): Promise<boolean>;
  /** Persiste el resultado de una ejecución (success o error). */
  recordResult(id: string, result: { endedAt: Date; success: boolean; error: string | null; disableOnError: boolean }): Promise<void>;
  /** Para administración: alta/edición. */
  save(task: ScheduledTaskProps): Promise<void>;
}

export function isDue(task: ScheduledTaskProps, now: Date): boolean {
  if (!task.enabled) return false;
  if (!task.lastStartUtc) return true;
  const nextRun = task.lastStartUtc.getTime() + task.seconds * 1000;
  return nextRun <= now.getTime();
}
