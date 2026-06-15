export type ScheduledTaskHandler = () => Promise<{ ok: boolean; message?: string }>;

export interface ScheduledTaskHandlerRegistration {
  type: string;
  /** Descripción humana del handler, solo informativa para el admin. */
  description: string;
  run: ScheduledTaskHandler;
}

/**
 * Registry de handlers de tareas programadas (r24 · sprint1_cierre). Los
 * módulos registran su handler por `type` en el bootstrap; el runner busca
 * tareas due en DB y ejecuta el handler correspondiente.
 *
 * El registry no es persistente: vive en memoria por instancia. La tabla
 * `scheduled_tasks` solo lleva el `type` como referencia.
 */
export class ScheduledTaskRegistry {
  private readonly handlers = new Map<string, ScheduledTaskHandlerRegistration>();

  register(registration: ScheduledTaskHandlerRegistration): void {
    if (this.handlers.has(registration.type)) {
      throw new Error(`Handler de tarea programada duplicado: ${registration.type}`);
    }
    this.handlers.set(registration.type, registration);
  }

  get(type: string): ScheduledTaskHandlerRegistration | null {
    return this.handlers.get(type) ?? null;
  }

  list(): ScheduledTaskHandlerRegistration[] {
    return [...this.handlers.values()];
  }
}
