import { Entity } from '@mitama/core';

interface ActivityLogEntryProps {
  userId: string | null;
  storeId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  ip: string | null;
  diff: Record<string, unknown> | null;
  createdAt: Date;
}

/**
 * Entrada de solo lectura del log de actividad. La escritura ocurre vía
 * `recordActivity` (transaccional, fuera del ciclo de entidades de dominio);
 * esta entidad solo se usa para reconstruir filas leídas.
 */
export class ActivityLogEntry extends Entity<ActivityLogEntryProps> {
  static rehydrate(props: ActivityLogEntryProps, id: string): ActivityLogEntry {
    return new ActivityLogEntry(id, props);
  }

  get userId(): string | null {
    return this.props.userId;
  }

  get storeId(): string | null {
    return this.props.storeId;
  }

  get action(): string {
    return this.props.action;
  }

  get entityType(): string {
    return this.props.entityType;
  }

  get entityId(): string {
    return this.props.entityId;
  }

  get ip(): string | null {
    return this.props.ip;
  }

  get diff(): Record<string, unknown> | null {
    return this.props.diff;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
