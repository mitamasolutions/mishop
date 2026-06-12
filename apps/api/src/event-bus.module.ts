import { Global, Module } from '@nestjs/common';
import { EVENT_BUS } from '@mitama/contracts';
import { InMemoryEventBus } from '@mitama/core';

/** Provee el bus de eventos in-process a todos los módulos de dominio. */
@Global()
@Module({
  providers: [{ provide: EVENT_BUS, useValue: new InMemoryEventBus() }],
  exports: [EVENT_BUS],
})
export class EventBusModule {}
