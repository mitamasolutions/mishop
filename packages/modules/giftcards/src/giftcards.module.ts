import { Module } from '@nestjs/common';
import { EVENT_BUS } from '@mitama/contracts';
import type { EventBus } from '@mitama/core';
import { GiftCardsController } from './http/giftcards.controller';
import { GIFTCARDS_TOKENS } from './giftcards.tokens';
import { PrismaGiftCardRepository } from './infra/prisma-gift-card.repository';
import { OrderEventsHandler } from './infra/order-events.handler';
import type { GiftCardRepository } from './domain/gift-card.repository';
import {
  DisableGiftCardUseCase,
  IssueGiftCardUseCase,
  RedeemGiftCardUseCase,
  ReleaseGiftCardForOrderUseCase,
} from './application/gift-card-use-cases';

@Module({
  controllers: [GiftCardsController],
  providers: [
    { provide: GIFTCARDS_TOKENS.giftCardRepository, useClass: PrismaGiftCardRepository },
    { provide: IssueGiftCardUseCase, useFactory: (repo: GiftCardRepository) => new IssueGiftCardUseCase(repo), inject: [GIFTCARDS_TOKENS.giftCardRepository] },
    { provide: RedeemGiftCardUseCase, useFactory: (repo: GiftCardRepository) => new RedeemGiftCardUseCase(repo), inject: [GIFTCARDS_TOKENS.giftCardRepository] },
    { provide: DisableGiftCardUseCase, useFactory: (repo: GiftCardRepository) => new DisableGiftCardUseCase(repo), inject: [GIFTCARDS_TOKENS.giftCardRepository] },
    { provide: ReleaseGiftCardForOrderUseCase, useFactory: (repo: GiftCardRepository) => new ReleaseGiftCardForOrderUseCase(repo), inject: [GIFTCARDS_TOKENS.giftCardRepository] },
    {
      provide: OrderEventsHandler,
      useFactory: (eventBus: EventBus, release: ReleaseGiftCardForOrderUseCase) => new OrderEventsHandler(eventBus, release),
      inject: [EVENT_BUS, ReleaseGiftCardForOrderUseCase],
    },
  ],
})
export class GiftCardsModule {}
