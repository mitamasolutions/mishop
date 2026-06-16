import type { DomainEvent } from './domain-event';
import type { EventBus, EventHandler, Unsubscribe } from './event-bus';

/**
 * Bus de eventos in-process. Suficiente para un modular monolith;
 * el día que haga falta un broker externo, se implementa EventBus con otro adapter.
 */
export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();

  async publish(event: DomainEvent): Promise<void> {
    const subscribers = this.handlers.get(event.name);
    if (!subscribers) {
      return;
    }
    for (const handler of subscribers) {
      await handler(event);
    }
  }

  subscribe<TEvent extends DomainEvent>(
    name: TEvent['name'],
    handler: EventHandler<TEvent>,
  ): Unsubscribe {
    const subscribers = this.handlers.get(name) ?? new Set<EventHandler>();
    subscribers.add(handler as EventHandler);
    this.handlers.set(name, subscribers);
    return () => {
      subscribers.delete(handler as EventHandler);
    };
  }
}
