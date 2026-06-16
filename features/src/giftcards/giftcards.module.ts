import { Module } from '@nestjs/common';
import { createModuleProviders, EVENT_BUS } from '@mitama/contracts';
import { GiftCardsController } from './http/giftcards.controller';
import { GIFTCARDS_TOKENS } from './giftcards.tokens';
import { PrismaGiftCardRepository } from './infra/prisma-gift-card.repository';
import { OrderEventsHandler } from './infra/order-events.handler';
import {
  DisableGiftCardUseCase,
  IssueGiftCardUseCase,
  RedeemGiftCardUseCase,
  ReleaseGiftCardForOrderUseCase,
} from './application/gift-card-use-cases';

@Module({
  controllers: [GiftCardsController],
  providers: createModuleProviders([
    { provide: GIFTCARDS_TOKENS.giftCardRepository, useClass: PrismaGiftCardRepository },
    { useCase: IssueGiftCardUseCase, inject: [GIFTCARDS_TOKENS.giftCardRepository] },
    { useCase: RedeemGiftCardUseCase, inject: [GIFTCARDS_TOKENS.giftCardRepository] },
    { useCase: DisableGiftCardUseCase, inject: [GIFTCARDS_TOKENS.giftCardRepository] },
    { useCase: ReleaseGiftCardForOrderUseCase, inject: [GIFTCARDS_TOKENS.giftCardRepository] },
    { provider: OrderEventsHandler, inject: [EVENT_BUS, ReleaseGiftCardForOrderUseCase] },
  ]),
})
export class GiftCardsModule {}
