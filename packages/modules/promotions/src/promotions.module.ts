import { Module } from '@nestjs/common';
import { PromotionsController } from './http/promotions.controller';
import { PROMOTIONS_TOKENS } from './promotions.tokens';
import { PrismaPromotionRepository } from './infra/prisma-promotion.repository';
import type { PromotionRepository } from './domain/promotion.repository';
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
  providers: [
    { provide: PROMOTIONS_TOKENS.promotionRepository, useClass: PrismaPromotionRepository },
    { provide: CreateDiscountUseCase, useFactory: (repo: PromotionRepository) => new CreateDiscountUseCase(repo), inject: [PROMOTIONS_TOKENS.promotionRepository] },
    { provide: CreateCouponUseCase, useFactory: (repo: PromotionRepository) => new CreateCouponUseCase(repo), inject: [PROMOTIONS_TOKENS.promotionRepository] },
    { provide: GenerateCouponsUseCase, useFactory: (createCoupon: CreateCouponUseCase, repo: PromotionRepository) => new GenerateCouponsUseCase(createCoupon, repo), inject: [CreateCouponUseCase, PROMOTIONS_TOKENS.promotionRepository] },
    { provide: PreviewPromotionsUseCase, useFactory: (repo: PromotionRepository) => new PreviewPromotionsUseCase(repo), inject: [PROMOTIONS_TOKENS.promotionRepository] },
    { provide: RedeemCouponUseCase, useFactory: (repo: PromotionRepository) => new RedeemCouponUseCase(repo), inject: [PROMOTIONS_TOKENS.promotionRepository] },
    { provide: ConfigureRewardProgramUseCase, useFactory: (repo: PromotionRepository) => new ConfigureRewardProgramUseCase(repo), inject: [PROMOTIONS_TOKENS.promotionRepository] },
    { provide: AccrueRewardPointsUseCase, useFactory: (repo: PromotionRepository) => new AccrueRewardPointsUseCase(repo), inject: [PROMOTIONS_TOKENS.promotionRepository] },
    { provide: ReverseRewardPointsUseCase, useFactory: (repo: PromotionRepository) => new ReverseRewardPointsUseCase(repo), inject: [PROMOTIONS_TOKENS.promotionRepository] },
    { provide: SubscribeNewsletterUseCase, useFactory: (repo: PromotionRepository) => new SubscribeNewsletterUseCase(repo), inject: [PROMOTIONS_TOKENS.promotionRepository] },
    { provide: ConfirmNewsletterUseCase, useFactory: (repo: PromotionRepository) => new ConfirmNewsletterUseCase(repo), inject: [PROMOTIONS_TOKENS.promotionRepository] },
    { provide: UnsubscribeNewsletterUseCase, useFactory: (repo: PromotionRepository) => new UnsubscribeNewsletterUseCase(repo), inject: [PROMOTIONS_TOKENS.promotionRepository] },
    { provide: ExportNewsletterCsvUseCase, useFactory: (repo: PromotionRepository) => new ExportNewsletterCsvUseCase(repo), inject: [PROMOTIONS_TOKENS.promotionRepository] },
  ],
})
export class PromotionsModule {}
