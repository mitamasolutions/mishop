/**
 * Evento de dominio: el único mecanismo de comunicación entre módulos
 * (regla 4 de arquitectura). Los contratos concretos viven en @mitama/contracts.
 */
export interface DomainEvent<TPayload = unknown> {
  /** Nombre único del evento, con namespace del módulo: "auth.user.registered". */
  readonly name: string;
  readonly occurredAt: Date;
  readonly payload: TPayload;
}
