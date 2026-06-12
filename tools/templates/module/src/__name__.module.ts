/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Module } from '@nestjs/common';
import { __CONST___TOKENS } from './__name__.tokens';
import { Create__Name__ItemUseCase } from './application/create-__name__-item/create-__name__-item.use-case';
import type { __Name__ItemRepository } from './domain/__name__-item.repository';
import { InMemory__Name__ItemRepository } from './infra/in-memory-__name__-item.repository';
import { __Name__Controller } from './http/__name__.controller';

@Module({
  controllers: [__Name__Controller],
  providers: [
    { provide: __CONST___TOKENS.itemRepository, useClass: InMemory__Name__ItemRepository },
    {
      provide: Create__Name__ItemUseCase,
      useFactory: (items: __Name__ItemRepository) => new Create__Name__ItemUseCase(items),
      inject: [__CONST___TOKENS.itemRepository],
    },
  ],
})
export class __Name__Module {}
