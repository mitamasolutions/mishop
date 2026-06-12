import { describe, expect, it } from 'vitest';
import type { DomainEvent } from './domain-event';
import { InMemoryEventBus } from './in-memory-event-bus';

interface PingPayload {
  message: string;
}

const pingEvent = (message: string): DomainEvent<PingPayload> => ({
  name: 'test.ping',
  occurredAt: new Date(),
  payload: { message },
});

describe('InMemoryEventBus', () => {
  it('entrega eventos a los suscriptores del nombre', async () => {
    const bus = new InMemoryEventBus();
    const received: string[] = [];

    bus.subscribe<DomainEvent<PingPayload>>('test.ping', (event) => {
      received.push(event.payload.message);
    });

    await bus.publish(pingEvent('hola'));

    expect(received).toEqual(['hola']);
  });

  it('no entrega eventos tras cancelar la suscripción', async () => {
    const bus = new InMemoryEventBus();
    const received: string[] = [];

    const unsubscribe = bus.subscribe<DomainEvent<PingPayload>>('test.ping', (event) => {
      received.push(event.payload.message);
    });
    unsubscribe();

    await bus.publish(pingEvent('hola'));

    expect(received).toEqual([]);
  });
});
