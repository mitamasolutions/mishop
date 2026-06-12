import type { DomainEvent } from './domain-event';

export type EventHandler<TEvent extends DomainEvent = DomainEvent> = (
  event: TEvent,
) => void | Promise<void>;

export type Unsubscribe = () => void;

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<TEvent extends DomainEvent>(
    name: TEvent['name'],
    handler: EventHandler<TEvent>,
  ): Unsubscribe;
}
