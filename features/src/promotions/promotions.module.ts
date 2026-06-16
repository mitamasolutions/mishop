import { Module } from '@nestjs/common';
import { createModuleProviders } from '@mitama/contracts';
import { PromotionsController } from './http/promotions.controller';
import { PROMOTIONS_TOKENS } from './promotions.tokens';
import { PrismaPromotionRepository } from './infra/prisma-promotion.repository';
import {
  AccrueRewardPointsUseCase,
  ConfigureRewardProgramUseCase,
  ConfirmNewsletterUseCase,
  CreateCouponUseCase,
  CreateDiscountUseCase,
  ExportNewsletterCsvUseCase,
  GenerateCouponsUseCase,
  PreviewPromotionsUseCase,
  RedeemCouponUseCase,
  ReverseRewardPointsUseCase,
  SubscribeNewsletterUseCase,
  UnsubscribeNewsletterUseCase,
} from './application/promotion-use-cases';

@Module({
  controllers: [PromotionsController],
  providers: createModuleProviders([
    { provide: PROMOTIONS_TOKENS.promotionRepository, useClass: PrismaPromotionRepository },
    { useCase: CreateDiscountUseCase, inject: [PROMOTIONS_TOKENS.promotionRepository] },
    { useCase: CreateCouponUseCase, inject: [PROMOTIONS_TOKENS.promotionRepository] },
    { useCase: GenerateCouponsUseCase, inject: [CreateCouponUseCase, PROMOTIONS_TOKENS.promotionRepository] },
    { useCase: PreviewPromotionsUseCase, inject: [PROMOTIONS_TOKENS.promotionRepository] },
    { useCase: RedeemCouponUseCase, inject: [PROMOTIONS_TOKENS.promotionRepository] },
    { useCase: ConfigureRewardProgramUseCase, inject: [PROMOTIONS_TOKENS.promotionRepository] },
    { useCase: AccrueRewardPointsUseCase, inject: [PROMOTIONS_TOKENS.promotionRepository] },
    { useCase: ReverseRewardPointsUseCase, inject: [PROMOTIONS_TOKENS.promotionRepository] },
    { useCase: SubscribeNewsletterUseCase, inject: [PROMOTIONS_TOKENS.promotionRepository] },
    { useCase: ConfirmNewsletterUseCase, inject: [PROMOTIONS_TOKENS.promotionRepository] },
    { useCase: UnsubscribeNewsletterUseCase, inject: [PROMOTIONS_TOKENS.promotionRepository] },
    { useCase: ExportNewsletterCsvUseCase, inject: [PROMOTIONS_TOKENS.promotionRepository] },
  ]),
})
export class PromotionsModule {}
